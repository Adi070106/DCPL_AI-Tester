import logging
from datetime import datetime
import os
import uuid
import json
from sqlalchemy.orm import Session
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from urllib.parse import urlparse

from app.config import SCREENSHOT_DIR
from app.database import SessionLocal
from app.models import AuditJob, Audit, Finding, Screenshot, Report
from app.engine.crawler import crawl_website
from app.engine.report_gen import generate_client_report_pdf, generate_developer_report_pdf
from app.engine.auditors import (
    audit_footer_compliance,
    audit_accessibility,
    audit_seo,
    audit_performance,
    audit_responsive,
    audit_visual_ui_and_branding,
    audit_navigation,
    audit_forms,
    audit_content_and_images,
    audit_security,
    audit_technical,
    audit_site_level_technical,
    audit_social_media,
)

logger = logging.getLogger(__name__)

def calculate_health_scores(findings_list: list, total_pages: int = 1, selected_categories: list = None) -> dict:
    """Calculate 0-100 scores for categories and overall health."""
    categories = {
        "seo": 100.0,
        "performance": 100.0,
        "accessibility": 100.0,
        "responsiveness": 100.0,
        "forms": 100.0,
        "navigation": 100.0,
        "security": 100.0,
        "content": 100.0,
        "branding": 100.0,
        "footer": 100.0,
    }
    
    # Severity deduction weights
    deductions = {
        "CRITICAL": 25.0,
        "HIGH": 15.0,
        "MEDIUM": 5.0,
        "LOW": 2.0
    }
    
    # Site-level issues are not divided by the number of pages (they are global)
    site_level_issues = {
        "TECH_ROBOTS_MISSING",
        "TECH_SITEMAP_MISSING",
        "TECH_SOFT_404"
    }
    
    divisor = max(1, total_pages)
    
    # Deduct score for each finding
    for f in findings_list:
        cat = f.get("category")
        sev = f.get("severity")
        code = f.get("issue_code")
        if cat in categories:
            weight = deductions.get(sev, 2.0)
            if code in site_level_issues:
                categories[cat] -= weight
            else:
                categories[cat] -= weight / divisor
            
    # Bound scores between 0 and 100
    for cat in categories:
        categories[cat] = int(max(0, min(100, categories[cat])))
        
    # If selected_categories is specified, set non-selected categories to -1
    if selected_categories is not None and len(selected_categories) > 0:
        for cat in list(categories.keys()):
            if cat not in selected_categories:
                categories[cat] = -1
                
    # Overall score is the simple average of all active/audited categories
    active_scores = [v for v in categories.values() if v >= 0]
    if active_scores:
        overall = sum(active_scores) // len(active_scores)
    else:
        overall = 0
    categories["overall"] = overall
    
    return categories

def execute_audit(job_id: int):
    """Executes the audit workflow: crawling, page audits, screenshot capture, scoring, and PDF reports."""
    db: Session = SessionLocal()
    job = db.query(AuditJob).filter(AuditJob.id == job_id).first()
    
    if not job:
        logger.error(f"Audit Job with ID {job_id} not found in database.")
        db.close()
        return
        
    logger.info(f"Starting execution of audit job {job_id} for URL {job.website_url}")
    
    # Fetch previously fixed findings for this target project/website URL
    def normalize_url(u: str) -> str:
        if not u:
            return ""
        u = u.strip().lower()
        if u.endswith("/"):
            u = u[:-1]
        return u

    current_site_clean = normalize_url(job.website_url)
    
    # Query all matching jobs for this project URL
    all_jobs = db.query(AuditJob).all()
    matching_job_ids = []
    for j in all_jobs:
        if normalize_url(j.website_url) == current_site_clean:
            matching_job_ids.append(j.id)
            
    fixed_finding_keys = set()
    if matching_job_ids:
        matching_audits = db.query(Audit).filter(Audit.audit_job_id.in_(matching_job_ids)).all()
        matching_audit_ids = [a.id for a in matching_audits]
        if matching_audit_ids:
            fixed_findings = db.query(Finding).filter(
                Finding.audit_id.in_(matching_audit_ids),
                Finding.is_fixed == True
            ).all()
            for ff in fixed_findings:
                norm_purl = normalize_url(ff.page_url)
                coords = ff.element_coords.strip() if ff.element_coords else ""
                fixed_finding_keys.add((norm_purl, ff.issue_code, coords))
                
    logger.info(f"Loaded {len(fixed_finding_keys)} previously fixed findings to ignore in this run.")

    def is_new_finding_previously_fixed(new_f) -> bool:
        new_purl = normalize_url(new_f.get("page_url", ""))
        new_code = new_f.get("issue_code")
        new_coords = new_f.get("element_coords", "") or ""
        if new_coords and not isinstance(new_coords, str):
            try:
                new_coords = json.dumps(new_coords)
            except Exception:
                new_coords = str(new_coords)
        new_coords = new_coords.strip() if isinstance(new_coords, str) else ""
        
        for (old_purl, old_code, old_coords) in fixed_finding_keys:
            if old_code == new_code and old_purl == new_purl:
                if old_coords == new_coords:
                    return True
                if not old_coords and not new_coords:
                    return True
        return False

    try:
        # Update job status
        job.status = "RUNNING"
        job.started_at = datetime.utcnow()
        job.progress_percentage = 5
        db.commit()
        
        # 1. Crawl website
        discovered_urls, crawl_relations, broken_links = crawl_website(job.website_url, max_pages=100)
        total_pages = len(discovered_urls)
        logger.info(f"Crawl finished. Discovered {total_pages} pages to audit. Found {len(broken_links)} broken links.")
        
        job.progress_percentage = 15
        db.commit()
        
        # 2. Setup Playwright & execute page audits
        all_raw_findings = []
        homepage_psi_score = None
        page_screenshots_info = []  # temporary store to associate with findings later
        
        # We will create the Audit record now to get its ID
        audit_rec = Audit(
            audit_job_id=job.id,
            total_pages_scanned=total_pages,
            crawl_relations_str=json.dumps(crawl_relations),
            broken_links_str=json.dumps(broken_links)
        )
        db.add(audit_rec)
        db.commit()
        db.refresh(audit_rec)
        
        page_load_times = []
        all_loaded_assets = []
        all_page_seo = []
        
        # Load brand rules
        brand_rules = None
        if job.user and job.user.brand_rules_str:
            try:
                brand_rules = json.loads(job.user.brand_rules_str)
            except Exception as e:
                logger.error(f"Error parsing brand_rules_str: {e}")
                
        def parse_rgb(rgb_str: str):
            import re
            m = re.match(r'rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)', rgb_str)
            if m:
                r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
                a = float(m.group(4)) if m.group(4) else 1.0
                return r, g, b, a
            return None
        
        with sync_playwright() as p:
            # Run headless
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            
            # Setup context with desktop dimensions by default
            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 DCPL-AI-Tester/1.0"
            )
            
            for idx, page_url in enumerate(discovered_urls):
                logger.info(f"Auditing page {idx+1}/{total_pages}: {page_url}")
                page = context.new_page()
                
                # Listen to console and network errors
                console_errors = []
                network_errors = []
                page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
                page.on("requestfailed", lambda req: network_errors.append(f"{req.url} ({req.failure if req.failure else 'failed'})") if req.url.startswith(job.website_url) else None)
                
                loaded_assets = []
                def handle_response(res):
                    try:
                        ct = res.headers.get("content-type", "").lower()
                        asset_type = None
                        if "stylesheet" in ct or "text/css" in ct:
                            asset_type = "stylesheet"
                        elif "javascript" in ct or "application/javascript" in ct or "text/javascript" in ct or "x-javascript" in ct:
                            asset_type = "script"
                        elif "image/" in ct:
                            asset_type = "image"
                        
                        if asset_type:
                            cl = res.headers.get("content-length")
                            size = 0
                            if cl:
                                try:
                                    size = int(cl)
                                except:
                                    pass
                            if size == 0 and res.status == 200:
                                try:
                                    size = len(res.body())
                                except:
                                    pass
                            if size > 0:
                                webp_savings = 0
                                if asset_type == "image" and not res.url.lower().endswith(".webp"):
                                    webp_savings = int(size * 0.6)
                                loaded_assets.append({
                                    "url": res.url,
                                    "size_bytes": size,
                                    "type": asset_type,
                                    "webp_savings_bytes": webp_savings
                                })
                    except Exception:
                        pass
                
                page.on("response", handle_response)
                
                try:
                    # Navigate with 20s timeout and measure load time
                    start_time = datetime.utcnow()
                    response = page.goto(page_url, timeout=20000, wait_until="load")
                    load_time_seconds = (datetime.utcnow() - start_time).total_seconds()
                    page_load_times.append({"url": page_url, "load_time": load_time_seconds})
                    page.wait_for_timeout(500)  # brief settle time
                    
                    # Add loaded assets to audit-level collection
                    all_loaded_assets.extend(loaded_assets)
                    
                    html_content = page.content()
                    soup = BeautifulSoup(html_content, "html.parser")
                    response_headers = response.headers if response else {}
                    
                    # Run Page-Level Auditors based on user selection
                    page_findings = []
                    selected = job.selected_categories
                    run_all = not selected or len(selected) == 0
                    
                    is_seed_url = (page_url.rstrip("/") == job.website_url.rstrip("/"))
                    if is_seed_url and (run_all or "security" in selected):
                        try:
                            from app.engine.auditors import audit_security_scorecard
                            scorecard = audit_security_scorecard(page_url, response_headers)
                            audit_rec.security_details_str = json.dumps(scorecard)
                            
                            if not scorecard.get("ssl_valid"):
                                page_findings.append({
                                    "issue_code": "SEC_SSL_INVALID",
                                    "category": "security",
                                    "severity": "CRITICAL",
                                    "title": "SSL Certificate Invalid or Expired",
                                    "description": f"The SSL certificate check failed for domain. Error: {scorecard.get('ssl_error')}",
                                    "business_impact": "Insecure or invalid SSL certificates cause browsers to show scary warnings, driving away 99%+ of visitors.",
                                    "developer_fix": "Obtain a valid SSL certificate and ensure it is properly installed on the host.",
                                    "confidence": "HIGH",
                                    "screenshot_reason": None
                                })
                            elif scorecard.get("ssl_days_remaining", 0) <= 30:
                                days = scorecard.get("ssl_days_remaining", 0)
                                page_findings.append({
                                    "issue_code": "SEC_SSL_EXPIRING_SOON",
                                    "category": "security",
                                    "severity": "HIGH",
                                    "title": "SSL Certificate Expiring Soon",
                                    "description": f"The SSL certificate for this domain expires in {days} days on {scorecard.get('ssl_expiry')}.",
                                    "business_impact": "When the certificate expires, users will see standard browser warnings and cannot access the site.",
                                    "developer_fix": "Renew the SSL certificate immediately to prevent access disruption.",
                                    "confidence": "HIGH",
                                    "screenshot_reason": None
                                })
                        except Exception as scorecard_ex:
                            logger.error(f"Failed to generate security scorecard: {scorecard_ex}")
                    
                    if run_all or "footer" in selected:
                        page_findings.extend(audit_footer_compliance(page, page_url, soup))
                        
                    if run_all or "branding" in selected:
                        page_findings.extend(audit_visual_ui_and_branding(page, page_url, soup))
                        
                        # Custom Brand Rules Checking
                        if brand_rules:
                            allowed_hex = brand_rules.get("allowed_colors") or []
                            allowed_fonts = brand_rules.get("allowed_fonts") or []
                            required_texts = brand_rules.get("required_texts") or []
                            
                            allowed_hex_set = {c.lower().strip() for c in allowed_hex if c.strip()}
                            neutrals = {
                                "#ffffff", "#000000", "#transparent",
                                "#f8f9fa", "#f9f9f9", "#fafafa", "#eeeeee", "#e0e0e0", "#dddddd", "#cccccc",
                                "#111111", "#222222", "#333333", "#444444", "#555555"
                            }
                            
                            try:
                                computed_elements = page.evaluate("""() => {
                                    const elements = document.querySelectorAll('*');
                                    const result = [];
                                    for (const el of elements) {
                                        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'IFRAME', 'HEAD', 'HTML'].includes(el.tagName)) continue;
                                        const rect = el.getBoundingClientRect();
                                        if (rect.width === 0 && rect.height === 0) continue;
                                        const computed = window.getComputedStyle(el);
                                        result.push({
                                            tagName: el.tagName,
                                            bg: computed.backgroundColor,
                                            color: computed.color,
                                            font: computed.fontFamily
                                        });
                                    }
                                    return result;
                                }""")
                                
                                color_deviations = set()
                                font_deviations = set()
                                
                                for el in computed_elements:
                                    for col_val, label in [(el["color"], "text"), (el["bg"], "background")]:
                                        if not col_val or col_val == "transparent" or col_val == "rgba(0, 0, 0, 0)":
                                            continue
                                        parsed = parse_rgb(col_val)
                                        if parsed:
                                            r, g, b, a = parsed
                                            if a > 0:
                                                h = f"#{r:02x}{g:02x}{b:02x}"
                                                if allowed_hex_set and h not in allowed_hex_set and h not in neutrals:
                                                    color_deviations.add(h)
                                                    
                                    if allowed_fonts:
                                        fonts_in_el = [f.strip().strip('"').strip("'").lower() for f in el["font"].split(",")]
                                        has_allowed_font = False
                                        for af in allowed_fonts:
                                            if af.lower().strip() in fonts_in_el:
                                                has_allowed_font = True
                                                break
                                        
                                        generic_fallbacks = {"sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui"}
                                        if not has_allowed_font and not any(gf in fonts_in_el for gf in generic_fallbacks):
                                            if fonts_in_el:
                                                font_deviations.add(fonts_in_el[0])
                                                
                                if color_deviations:
                                    page_findings.append({
                                        "issue_code": "BRAND_COLOR_MISMATCH",
                                        "category": "branding",
                                        "severity": "MEDIUM",
                                        "title": "Brand Color Mismatch",
                                        "description": f"Elements on this page use colors ({', '.join(color_deviations)}) outside the configured allowed brand colors ({', '.join(allowed_hex)}).",
                                        "business_impact": "Inconsistent color branding dilutes brand identity and leads to a less professional user experience.",
                                        "developer_fix": "Update stylesheets to use variables matching the approved brand palette.",
                                        "source": "custom",
                                        "confidence": "HIGH",
                                        "page_url": page_url
                                    })
                                    
                                if font_deviations:
                                    page_findings.append({
                                        "issue_code": "BRAND_FONT_MISMATCH",
                                        "category": "branding",
                                        "severity": "LOW",
                                        "title": "Brand Font Mismatch",
                                        "description": f"Elements on this page use font families ({', '.join(font_deviations)}) not defined in the allowed brand fonts ({', '.join(allowed_fonts)}).",
                                        "business_impact": "Typography is key to brand recognition. Mismatched fonts make layouts look unpolished.",
                                        "developer_fix": "Ensure all typography uses approved font-family CSS declarations.",
                                        "source": "custom",
                                        "confidence": "HIGH",
                                        "page_url": page_url
                                    })
                                    
                                try:
                                    page_text = page.inner_text("body").lower()
                                except:
                                    page_text = soup.get_text().lower()
                                missing_texts = []
                                for req_text in required_texts:
                                    if req_text.strip().lower() not in page_text:
                                        missing_texts.append(req_text)
                                        
                                if missing_texts:
                                    page_findings.append({
                                        "issue_code": "BRAND_TEXT_MISSING",
                                        "category": "branding",
                                        "severity": "HIGH",
                                        "title": "Required Brand/Copyright Text Missing",
                                        "description": f"This page is missing the required brand texts: {', '.join(missing_texts)}.",
                                        "business_impact": "Missing copyright labels or legally required brand text can expose the business to compliance issues.",
                                        "developer_fix": "Add the missing copyright/brand strings to the page footer or appropriate layout template.",
                                        "source": "custom",
                                        "confidence": "HIGH",
                                        "page_url": page_url
                                    })
                            except Exception as brand_ex:
                                logger.error(f"Error checking brand rules on {page_url}: {brand_ex}")
                        
                    if run_all or "accessibility" in selected:
                        page_findings.extend(audit_accessibility(page, page_url))
                        
                    if run_all or "seo" in selected:
                        page_findings.extend(audit_seo(page, page_url, soup))
                        
                    if run_all or "performance" in selected:
                        perf_findings, psi_score = audit_performance(
                            page, 
                            page_url, 
                            is_seed_url=(page_url.rstrip("/") == job.website_url.rstrip("/")), 
                            audit_id=audit_rec.id
                        )
                        page_findings.extend(perf_findings)
                        if psi_score is not None:
                            homepage_psi_score = psi_score
                        
                    if run_all or "responsiveness" in selected:
                        page_findings.extend(audit_responsive(page, page_url))
                        
                    if run_all or "navigation" in selected:
                        page_findings.extend(audit_navigation(page, page_url, soup))
                        page_findings.extend(audit_technical(page, page_url, soup, console_errors, network_errors))
                        
                    if run_all or "navigation" in selected or "footer" in selected:
                        page_findings.extend(audit_social_media(page, page_url, soup))
                        
                    if run_all or "forms" in selected:
                        page_findings.extend(audit_forms(page, page_url, soup))
                        
                    if run_all or "content" in selected:
                        page_findings.extend(audit_content_and_images(page, page_url, soup))
                        
                    if run_all or "security" in selected:
                        page_findings.extend(audit_security(page, page_url, response_headers, soup))
                    
                    # SEO & Social Previews data extraction
                    page_seo_data = {
                        "url": page_url,
                        "title": page.title() or "",
                        "description": "",
                        "og_title": "",
                        "og_description": "",
                        "og_image": "",
                        "og_type": "",
                        "twitter_title": "",
                        "twitter_description": "",
                        "twitter_image": "",
                        "twitter_card": "",
                        "schemas": []
                    }
                    
                    meta_desc = soup.find("meta", attrs={"name": "description"})
                    if meta_desc:
                        page_seo_data["description"] = meta_desc.get("content", "") or ""
                        
                    for meta in soup.find_all("meta"):
                        prop = meta.get("property", "").lower()
                        name = meta.get("name", "").lower()
                        content = meta.get("content", "") or ""
                        
                        if prop == "og:title":
                            page_seo_data["og_title"] = content
                        elif prop == "og:description":
                            page_seo_data["og_description"] = content
                        elif prop == "og:image":
                            page_seo_data["og_image"] = content
                        elif prop == "og:type":
                            page_seo_data["og_type"] = content
                        elif name == "twitter:title":
                            page_seo_data["twitter_title"] = content
                        elif name == "twitter:description":
                            page_seo_data["twitter_description"] = content
                        elif name == "twitter:image":
                            page_seo_data["twitter_image"] = content
                        elif name == "twitter:card":
                            page_seo_data["twitter_card"] = content
                            
                    schemas_found = []
                    for script in soup.find_all("script", type="application/ld+json"):
                        try:
                            raw_json = script.string
                            if not raw_json:
                                continue
                            data = json.loads(raw_json)
                            
                            items_to_check = []
                            if isinstance(data, dict):
                                items_to_check.append(data)
                            elif isinstance(data, list):
                                items_to_check.extend([item for item in data if isinstance(item, dict)])
                                
                            for item in items_to_check:
                                t = item.get("@type")
                                if not t:
                                    continue
                                
                                issues = []
                                if "@context" not in item:
                                    issues.append("Missing '@context'")
                                    
                                if t == "LocalBusiness":
                                    for field in ["name", "address", "telephone"]:
                                        if field not in item:
                                            issues.append(f"Missing '{field}'")
                                elif t == "Organization":
                                    for field in ["name", "url"]:
                                        if field not in item:
                                            issues.append(f"Missing '{field}'")
                                elif t == "BreadcrumbList":
                                    if "itemListElement" not in item:
                                        issues.append("Missing 'itemListElement'")
                                
                                schemas_found.append({
                                    "type": t,
                                    "raw_json": json.dumps(item),
                                    "is_valid": len(issues) == 0,
                                    "issues": issues
                                })
                        except Exception as schema_ex:
                            schemas_found.append({
                                "type": "InvalidJSON",
                                "raw_json": script.string or "",
                                "is_valid": False,
                                "issues": [f"Failed to parse JSON: {str(schema_ex)}"]
                            })
                            
                    page_seo_data["schemas"] = schemas_found
                    all_page_seo.append(page_seo_data)
                    
                    # Capture screenshots for CRITICAL / HIGH findings on this page
                    # We group by screenshot reason to avoid taking identical screenshots
                    screenshot_reasons_handled = {}  # map reason -> screenshot_id
                    
                    for f in page_findings:
                        f["page_url"] = page_url
                        
                    page_findings = [f for f in page_findings if not is_new_finding_previously_fixed(f)]
                    
                    for f in page_findings:
                        reason = f.get("screenshot_reason")
                        if reason:
                            if reason not in screenshot_reasons_handled:
                                # Take screenshot
                                filename = f"screenshot_{audit_rec.id}_{uuid.uuid4().hex[:8]}.png"
                                filepath = SCREENSHOT_DIR / filename
                                
                                try:
                                    # Ensure viewport is standard desktop for the screenshot
                                    page.screenshot(path=str(filepath), full_page=False)
                                    
                                    # Store Screenshot in DB metadata
                                    screenshot_rec = Screenshot(
                                        audit_id=audit_rec.id,
                                        page_url=page_url,
                                        file_path=f"storage/screenshots/{filename}",
                                        reason=reason
                                    )
                                    db.add(screenshot_rec)
                                    db.commit()
                                    db.refresh(screenshot_rec)
                                    
                                    screenshot_reasons_handled[reason] = screenshot_rec.id
                                    f["screenshot_id"] = screenshot_rec.id
                                    
                                except Exception as ss_ex:
                                    logger.error(f"Failed to capture screenshot for {page_url}: {ss_ex}")
                                    
                            else:
                                f["screenshot_id"] = screenshot_reasons_handled[reason]
                                
                    all_raw_findings.extend(page_findings)
                        
                except Exception as page_ex:
                    logger.error(f"Failed to audit page {page_url}: {page_ex}")
                    # Log as a technical network/timeout finding
                    all_raw_findings.append({
                        "issue_code": "TECH_PAGE_LOAD_FAILED",
                        "category": "navigation",
                        "severity": "CRITICAL",
                        "title": "Page Failed to Load",
                        "description": f"Auditor could not complete page load or crashed on: {page_url}. Error: {str(page_ex)}",
                        "business_impact": "Failed page loads prevent users and search engines from accessing content, leading to drop-offs.",
                        "developer_fix": "Check server logs for crashes, optimize script execution timeouts, and verify network connectivity.",
                        "confidence": "HIGH",
                        "page_url": page_url,
                        "screenshot_reason": None
                    })
                finally:
                    page.close()
                    
                # Update progress percentage (ranging from 15% to 80%)
                progress = int(15 + (idx + 1) / total_pages * 65)
                job.progress_percentage = progress
                db.commit()
                
            browser.close()
            
        # 3. Site-level Auditors
        selected = job.selected_categories
        run_all = not selected or len(selected) == 0
        
        if run_all or "seo" in selected:
            logger.info("Executing site-level technical checks...")
            site_findings = audit_site_level_technical(job.website_url)
            for sf in site_findings:
                sf["page_url"] = job.website_url
            
            site_findings = [sf for sf in site_findings if not is_new_finding_previously_fixed(sf)]
            for sf in site_findings:
                all_raw_findings.append(sf)
            
        # 4. Calculate Scores
        scores = calculate_health_scores(all_raw_findings, total_pages, selected)
        if homepage_psi_score is not None:
            scores["performance"] = homepage_psi_score
            active_scores = [v for k, v in scores.items() if k != "overall" and v >= 0]
            if active_scores:
                scores["overall"] = sum(active_scores) // len(active_scores)
        
        # Save performance assets & rankings
        top_slowest_pages = sorted(page_load_times, key=lambda x: x["load_time"], reverse=True)[:5]
        audit_rec.slowest_pages_str = json.dumps(top_slowest_pages)
        
        unique_assets = {}
        for asset in all_loaded_assets:
            url = asset["url"]
            if url not in unique_assets or asset["size_bytes"] > unique_assets[url]["size_bytes"]:
                unique_assets[url] = asset
        top_heavy_assets = sorted(unique_assets.values(), key=lambda x: x["size_bytes"], reverse=True)[:5]
        audit_rec.heavy_assets_str = json.dumps(top_heavy_assets)
        
        # Save SEO page metadata
        audit_rec.page_seo_str = json.dumps(all_page_seo)
        
        audit_rec.overall_health_score = scores["overall"]
        audit_rec.seo_score = scores["seo"]
        audit_rec.performance_score = scores["performance"]
        audit_rec.accessibility_score = scores["accessibility"]
        audit_rec.responsiveness_score = scores["responsiveness"]
        audit_rec.forms_score = scores["forms"]
        audit_rec.navigation_score = scores["navigation"]
        audit_rec.security_score = scores["security"]
        audit_rec.content_score = scores["content"]
        audit_rec.branding_score = scores["branding"]
        audit_rec.footer_score = scores["footer"]
        db.commit()
        
        # 5. Insert findings into DB
        for f in all_raw_findings:
            finding_rec = Finding(
                audit_id=audit_rec.id,
                issue_code=f.get("issue_code"),
                category=f.get("category"),
                page_url=f.get("page_url"),
                severity=f.get("severity"),
                title=f.get("title"),
                description=f.get("description"),
                business_impact=f.get("business_impact"),
                developer_fix=f.get("developer_fix"),
                source=f.get("source", "custom"),
                confidence=f.get("confidence", "HIGH"),
                screenshot_id=f.get("screenshot_id"),
                element_coords=f.get("element_coords")
            )
            db.add(finding_rec)
        db.commit()
        
        job.progress_percentage = 90
        db.commit()
        
        # 6. Generate PDF Reports
        logger.info("Generating PDF reports...")
        client_pdf_filename = f"report_client_{audit_rec.id}_{uuid.uuid4().hex[:8]}.pdf"
        developer_pdf_filename = f"report_developer_{audit_rec.id}_{uuid.uuid4().hex[:8]}.pdf"
        
        client_pdf_path = generate_client_report_pdf(audit_rec, all_raw_findings, client_pdf_filename)
        dev_pdf_path = generate_developer_report_pdf(audit_rec, all_raw_findings, developer_pdf_filename)
        
        # Save Report records
        client_rep = Report(
            audit_id=audit_rec.id,
            report_type="CLIENT",
            file_path=client_pdf_path
        )
        dev_rep = Report(
            audit_id=audit_rec.id,
            report_type="DEVELOPER",
            file_path=dev_pdf_path
        )
        db.add(client_rep)
        db.add(dev_rep)
        db.commit()
        
        # 7. Finalize Job
        job.status = "COMPLETED"
        job.progress_percentage = 100
        job.completed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Audit job {job_id} successfully completed. Health score: {audit_rec.overall_health_score}")
        
    except Exception as e:
        logger.error(f"Fatal error running audit job {job_id}: {e}", exc_info=True)
        job.status = "FAILED"
        job.completed_at = datetime.utcnow()
        db.commit()
        
    finally:
        db.close()
