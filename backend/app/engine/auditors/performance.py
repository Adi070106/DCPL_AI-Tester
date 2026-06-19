import logging
import time
import requests
from typing import List, Dict, Any
from app.config import SCREENSHOT_DIR

logger = logging.getLogger(__name__)

def audit_performance(page, url: str, is_seed_url: bool = False, audit_id: int = None) -> tuple:
    findings = []
    psi_score = None
    
    if is_seed_url and audit_id is not None:
        logger.info(f"Running Google PageSpeed Insights audit for seed URL: {url}")
        
        # 1. Fetch scores from Google PageSpeed Insights API
        mobile_score = None
        desktop_score = None
        
        try:
            res_mobile = requests.get(
                "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
                params={"url": url, "strategy": "mobile", "category": "performance"},
                timeout=45
            ).json()
            mobile_score = int(res_mobile["lighthouseResult"]["categories"]["performance"]["score"] * 100)
        except Exception as api_ex:
            logger.error(f"Failed to fetch PageSpeed Insights Mobile score: {api_ex}")
            
        try:
            res_desktop = requests.get(
                "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
                params={"url": url, "strategy": "desktop", "category": "performance"},
                timeout=45
            ).json()
            desktop_score = int(res_desktop["lighthouseResult"]["categories"]["performance"]["score"] * 100)
        except Exception as api_ex:
            logger.error(f"Failed to fetch PageSpeed Insights Desktop score: {api_ex}")
            
        if mobile_score is not None:
            psi_score = mobile_score
            findings.append({
                "issue_code": "PERF_PSI_MOBILE_SCORE",
                "category": "performance",
                "severity": "HIGH" if mobile_score < 50 else "MEDIUM" if mobile_score < 90 else "LOW",
                "title": f"Google PageSpeed Mobile Score: {mobile_score}/100",
                "description": f"Google PageSpeed Insights analyzed the page on mobile and returned a score of {mobile_score}/100.",
                "business_impact": "Mobile load speed is a critical ranking factor for Google Search. Low scores hurt search visibility and user retention.",
                "developer_fix": "Optimize render-blocking resources, serve images in modern formats like WebP/AVIF, and reduce main-thread work.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
            
        if desktop_score is not None:
            if psi_score is None:
                psi_score = desktop_score
            findings.append({
                "issue_code": "PERF_PSI_DESKTOP_SCORE",
                "category": "performance",
                "severity": "HIGH" if desktop_score < 50 else "MEDIUM" if desktop_score < 90 else "LOW",
                "title": f"Google PageSpeed Desktop Score: {desktop_score}/100",
                "description": f"Google PageSpeed Insights analyzed the page on desktop and returned a score of {desktop_score}/100.",
                "business_impact": "Desktop performance influences conversions and engagement for desktop users.",
                "developer_fix": "Optimize images, implement code-splitting, and leverage browser caching.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
            
        # 2. Capture report screenshots using Playwright
        if page.context:
            browser_context = page.context
            
            # Desktop PSI Screenshot
            desktop_psi_page = browser_context.new_page()
            desktop_psi_page.set_viewport_size({"width": 1366, "height": 800})
            desktop_psi_url = f"https://pagespeed.web.dev/analysis?url={url}&form_factor=desktop"
            try:
                logger.info(f"Navigating to PSI desktop for screenshot: {desktop_psi_url}")
                desktop_psi_page.goto(desktop_psi_url, timeout=90000)
                desktop_psi_page.wait_for_selector(".lh-gauge__percentage", state="attached", timeout=90000)
                
                # Dismiss cookie banner if visible
                try:
                    ok_btn = desktop_psi_page.locator('button:has-text("Got it"), button:has-text("Ok, Got it")')
                    if ok_btn.count() > 0:
                        ok_btn.first.click(timeout=5000)
                        time.sleep(1)
                except Exception as click_ex:
                    logger.debug(f"Cookie banner click skipped or failed: {click_ex}")

                # Scroll first visible gauge into view to show circular score ratings
                desktop_psi_page.locator(".lh-gauge__percentage:visible").first.scroll_into_view_if_needed()
                time.sleep(3)  # wait for gauge animation
                
                ss_path = SCREENSHOT_DIR / f"psi_desktop_{audit_id}.png"
                desktop_psi_page.screenshot(path=str(ss_path), full_page=False)
                logger.info(f"PSI Desktop screenshot saved: {ss_path}")
            except Exception as ss_ex:
                logger.error(f"Failed to capture PSI Desktop screenshot: {ss_ex}")
            finally:
                desktop_psi_page.close()
                
            # Mobile PSI Screenshot
            mobile_psi_page = browser_context.new_page()
            mobile_psi_page.set_viewport_size({"width": 1366, "height": 800})
            mobile_psi_url = f"https://pagespeed.web.dev/analysis?url={url}&form_factor=mobile"
            try:
                logger.info(f"Navigating to PSI mobile for screenshot: {mobile_psi_url}")
                mobile_psi_page.goto(mobile_psi_url, timeout=90000)
                mobile_psi_page.wait_for_selector(".lh-gauge__percentage", state="attached", timeout=90000)
                
                # Dismiss cookie banner if visible
                try:
                    ok_btn = mobile_psi_page.locator('button:has-text("Got it"), button:has-text("Ok, Got it")')
                    if ok_btn.count() > 0:
                        ok_btn.first.click(timeout=5000)
                        time.sleep(1)
                except Exception as click_ex:
                    logger.debug(f"Cookie banner click skipped or failed: {click_ex}")

                # Scroll first visible gauge into view to show circular score ratings
                mobile_psi_page.locator(".lh-gauge__percentage:visible").first.scroll_into_view_if_needed()
                time.sleep(3)  # wait for gauge animation
                
                ss_path = SCREENSHOT_DIR / f"psi_mobile_{audit_id}.png"
                mobile_psi_page.screenshot(path=str(ss_path), full_page=False)
                logger.info(f"PSI Mobile screenshot saved: {ss_path}")
            except Exception as ss_ex:
                logger.error(f"Failed to capture PSI Mobile screenshot: {ss_ex}")
            finally:
                mobile_psi_page.close()

    # Fall back to local performance check (always run local checks for other pages,
    # or if PSI api/screenshots failed for seed URL)
    try:
        timing = page.evaluate("() => JSON.parse(JSON.stringify(window.performance.timing))")
        resources = page.evaluate("""() => {
            return performance.getEntriesByType('resource').map(r => ({
                name: r.name,
                transferSize: r.transferSize,
                duration: r.duration,
                initiatorType: r.initiatorType
            }));
        }""")
        
        nav_start = timing.get("navigationStart", 0)
        load_end = timing.get("loadEventEnd", 0)
        
        if nav_start > 0 and load_end > 0:
            load_time_ms = load_end - nav_start
            load_time_sec = load_time_ms / 1000.0
            
            if load_time_sec > 3.0:
                severity = "HIGH" if load_time_sec > 6.0 else "MEDIUM"
                findings.append({
                    "issue_code": "PERF_SLOW_LOAD",
                    "category": "performance",
                    "severity": severity,
                    "title": f"Slow Page Load Time ({load_time_sec:.2f}s)",
                    "description": f"The page took {load_time_sec:.2f} seconds to complete loading. Sites should load in under 2 seconds.",
                    "business_impact": "Slow loading times directly lead to increased bounce rates, decreased conversion rates, and lower SEO search rankings.",
                    "developer_fix": "Optimize database queries, enable gzip/brotli compression, leverage browser caching, and reduce block render blocking assets.",
                    "confidence": "HIGH",
                    "screenshot_reason": None
                })
        
        heavy_assets = []
        for res in resources:
            size_bytes = res.get("transferSize", 0)
            name = res.get("name", "")
            if size_bytes > 1.5 * 1024 * 1024:
                heavy_assets.append(f"{name} ({size_bytes / (1024*1024):.2f}MB)")
                
        if heavy_assets:
            findings.append({
                "issue_code": "PERF_HEAVY_ASSETS",
                "category": "performance",
                "severity": "HIGH",
                "title": "Heavy Assets Detected",
                "description": f"The following files are extremely large: {', '.join(heavy_assets)}.",
                "business_impact": "Large files delay the time-to-interactive and exhaust mobile data plans, causing users to abandon the site.",
                "developer_fix": "Compress and optimize images (use WebP/AVIF), split and bundle JavaScript/CSS files, and defer unused assets.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
            
        total_requests = len(resources)
        if total_requests > 80:
            findings.append({
                "issue_code": "PERF_EXCESSIVE_REQUESTS",
                "category": "performance",
                "severity": "MEDIUM",
                "title": f"Excessive Request Count ({total_requests} requests)",
                "description": f"The page triggered {total_requests} resource requests. High request counts increase round-trip times.",
                "business_impact": "Multiple connection negotiations delay rendering, particularly on slower networks (3G/4G).",
                "developer_fix": "Combine scripts and stylesheets, implement CSS sprites, and lazy-load off-screen assets.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
            
        paint_entries = page.evaluate("() => performance.getEntriesByType('paint').map(e => ({ name: e.name, startTime: e.startTime }))")
        fcp = None
        for entry in paint_entries:
            if entry.get("name") == "first-contentful-paint":
                fcp = entry.get("startTime") / 1000.0
                break
                
        if fcp and fcp > 2.0:
            findings.append({
                "issue_code": "PERF_HIGH_FCP",
                "category": "performance",
                "severity": "MEDIUM",
                "title": f"High First Contentful Paint ({fcp:.2f}s)",
                "description": f"First Contentful Paint is {fcp:.2f}s, which is slower than the recommended limit of 1.8s.",
                "business_impact": "Slow visual feedback gives users the impression that the website is unresponsive or down.",
                "developer_fix": "Eliminate render-blocking CSS/JS, optimize font loading, and ensure server responds quickly.",
                "confidence": "MEDIUM",
                "screenshot_reason": None
            })
            
    except Exception as e:
        logger.error(f"Error performing local performance audit on {url}: {e}")
        
    return findings, psi_score
