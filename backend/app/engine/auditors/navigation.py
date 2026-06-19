import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Cache external link status to prevent duplicate requests
LINK_CACHE = {}

def check_link_status(url: str) -> int:
    """Perform a HEAD request to check link status, caching the result."""
    if url in LINK_CACHE:
        return LINK_CACHE[url]
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DCPL-AI-Tester/1.0"
    }
    
    try:
        # Try HEAD first as it's faster
        res = requests.head(url, headers=headers, allow_redirects=True, timeout=4)
        status = res.status_code
        # Some servers block HEAD, try GET as fallback
        if status in (404, 405, 403, 501):
            res = requests.get(url, headers=headers, allow_redirects=True, timeout=4, stream=True)
            status = res.status_code
    except Exception:
        status = 999  # Connection failed
        
    LINK_CACHE[url] = status
    return status

def audit_navigation(page, url: str, soup: BeautifulSoup) -> List[Dict[str, Any]]:
    findings = []
    
    # 1. Header and Footer navigation presence
    has_header_nav = soup.find("nav") or soup.find(class_="header") or soup.find(id="header")
    has_footer_nav = soup.find("footer") or soup.find(class_="footer") or soup.find(id="footer")
    
    if not has_header_nav:
        findings.append({
            "issue_code": "NAV_HEADER_MISSING",
            "category": "navigation",
            "severity": "HIGH",
            "title": "Header Navigation Missing",
            "description": "No header navigation elements (<nav> or header containers) could be identified.",
            "business_impact": "Users rely on header menus to navigate sites. Without one, page accessibility and retention drop significantly.",
            "developer_fix": "Wrap main navigation menus in a semantic <nav> element in the header.",
            "confidence": "MEDIUM",
            "screenshot_reason": "Header navigation missing"
        })

    # 2. CTA validation
    # Only target <a> anchor tags since <button> tags are form controllers and interactive triggers (no href needed)
    ctas = soup.find_all("a", class_=lambda c: c and any(word in c.lower() for word in ["btn", "button", "cta", "call-to-action"]))
    for cta in ctas:
        # Skip if it is an interactive UI toggle (dropdown, modal, collapse, tab, etc.)
        if any(cta.has_attr(attr) for attr in ["data-toggle", "data-bs-toggle", "data-target", "data-bs-target", "aria-expanded", "aria-controls"]):
            continue
            
        href = cta.get("href", "").strip()
        text = cta.get_text().strip()
        
        # Skip empty text elements (e.g. icon-only links)
        if not text:
            continue
            
        # Check for placeholder CTAs
        if href in ("", "#", "javascript:void(0)", "javascript:;"):
            findings.append({
                "issue_code": "CTA_PLACEHOLDER",
                "category": "navigation",
                "severity": "CRITICAL",
                "title": f"Placeholder CTA Found: '{text}'",
                "description": f"The call-to-action '{text}' points to a placeholder link ('{href}').",
                "business_impact": "Placeholder CTAs prevent users from converting, rendering registration, sales, or contact channels broken.",
                "developer_fix": "Replace the placeholder value with a valid URL or link to the appropriate page/anchor.",
                "confidence": "HIGH",
                "screenshot_reason": "Broken CTA placeholder link"
            })

    # 3. Link validation (limit to first 15 links per page to keep audits reasonably fast)
    links = soup.find_all("a", href=True)
    links_to_test = []
    for link in links:
        href = link["href"].strip()
        # Skip relative anchors and mailto/tel links
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        # Construct absolute URL
        absolute_url = urljoin(url, href)
        links_to_test.append((absolute_url, link.get_text().strip() or href))
        if len(links_to_test) >= 15:
            break
            
    broken_links = []
    for absolute_url, link_text in links_to_test:
        status = check_link_status(absolute_url)
        if status >= 400:
            broken_links.append(f"'{link_text}' -> {absolute_url} (HTTP {status})")
            
    if broken_links:
        findings.append({
            "issue_code": "NAV_BROKEN_LINKS",
            "category": "navigation",
            "severity": "HIGH",
            "title": f"Broken Links Found ({len(broken_links)} links)",
            "description": "We found broken links on the page: " + " | ".join(broken_links[:5]),
            "business_impact": "Broken links frustrate users, damage search engine ranking crawls, and hurt site authority.",
            "developer_fix": "Update or remove the broken links from the content. Set up proper 301 redirects if pages have moved.",
            "confidence": "HIGH",
            "screenshot_reason": "Broken navigation link detected"
        })

    # 4. Breadcrumb Auditor
    # Detect breadcrumb block
    breadcrumb_block = soup.find(lambda tag: tag.name in ["nav", "div", "ol", "ul"] and tag.get("class") and any("breadcrumb" in str(c).lower() for c in tag.get("class")))
    
    if breadcrumb_block:
        # Check breadcrumbs links
        bc_links = breadcrumb_block.find_all("a")
        if not bc_links:
            findings.append({
                "issue_code": "BREADCRUMB_NO_LINKS",
                "category": "navigation",
                "severity": "MEDIUM",
                "title": "Breadcrumb Element Has No Links",
                "description": "A breadcrumb container was found, but it does not contain navigable links.",
                "business_impact": "Non-clickable breadcrumbs defeat the purpose of breadcrumb navigation, failing to help user navigation hierarchy.",
                "developer_fix": "Ensure all breadcrumb steps except the current page are wrapped in anchor <a> tags.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
            
        # Check schema markup for Breadcrumbs
        schema_found = False
        scripts = soup.find_all("script", type="application/ld+json")
        for s in scripts:
            try:
                import json
                data = json.loads(s.string)
                if data.get("@type") == "BreadcrumbList" or (isinstance(data.get("@graph"), list) and any(item.get("@type") == "BreadcrumbList" for item in data["@graph"])):
                    schema_found = True
                    break
            except Exception:
                pass
                
        if not schema_found:
            findings.append({
                "issue_code": "BREADCRUMB_NO_SCHEMA",
                "category": "navigation",
                "severity": "LOW",
                "title": "Missing Breadcrumb Schema Markup",
                "description": "Breadcrumb navigation is present but lacks JSON-LD BreadcrumbList structured data.",
                "business_impact": "Structured schemas help Google index and show breadcrumbs in search results, increasing visibility.",
                "developer_fix": "Add BreadcrumbList JSON-LD metadata in the header of pages containing breadcrumbs.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })

    return findings
