import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def check_site_file(base_url: str, filename: str) -> bool:
    """Check if a site-level file (like robots.txt) exists and is not empty."""
    url = urljoin(base_url, filename)
    try:
        res = requests.get(url, timeout=5)
        return res.status_code == 200 and len(res.text.strip()) > 0
    except Exception:
        return False

def audit_technical(page, url: str, soup: BeautifulSoup, console_errors: List[str], network_errors: List[str]) -> List[Dict[str, Any]]:
    findings = []
    
    # 1. Favicon presence
    favicon = soup.find("link", rel=lambda r: r and any(w in str(r).lower() for w in ["icon", "shortcut"]))
    if not favicon:
        findings.append({
            "issue_code": "TECH_FAVICON_MISSING",
            "category": "navigation", # fits in navigation/technical
            "severity": "LOW",
            "title": "Favicon Missing",
            "description": "No favicon link (<link rel='icon' ...>) found on this page.",
            "business_impact": "Favicons are displayed in browser tabs and search listings, affecting branding and recognition.",
            "developer_fix": "Add a <link rel='icon' href='/favicon.ico'> reference in the page <head>.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    # 2. Console Errors Check
    if console_errors:
        err_list = " | ".join(console_errors[:5])
        findings.append({
            "issue_code": "TECH_CONSOLE_ERRORS",
            "category": "performance", # maps to technical/performance
            "severity": "HIGH",
            "title": f"Console Errors Detected ({len(console_errors)} errors)",
            "description": f"Browser console errors were logged: {err_list}.",
            "business_impact": "JavaScript exceptions can break layout interactive features, forms, and core page operations.",
            "developer_fix": "Debug the console errors inside DevTools and resolve the failing scripts or undefined variables.",
            "confidence": "HIGH",
            "screenshot_reason": "Browser console exceptions thrown"
        })

    # 3. Network Errors Check
    if network_errors:
        net_list = " | ".join(network_errors[:5])
        findings.append({
            "issue_code": "TECH_NETWORK_ERRORS",
            "category": "performance",
            "severity": "HIGH",
            "title": f"Network Load Failures ({len(network_errors)} resources)",
            "description": f"Resources failed to load: {net_list}.",
            "business_impact": "Failed network requests mean scripts, fonts, images, or API data are missing on the screen.",
            "developer_fix": "Verify that resource endpoints are active, CORS rules allow access, and file paths are correct.",
            "confidence": "HIGH",
            "screenshot_reason": "Resource network load failure"
        })

    return findings

def audit_site_level_technical(base_url: str) -> List[Dict[str, Any]]:
    """Performs checks that apply to the whole site (robots.txt, sitemap.xml, 404 page)."""
    findings = []
    
    # 1. Robots.txt
    if not check_site_file(base_url, "robots.txt"):
        findings.append({
            "issue_code": "TECH_ROBOTS_MISSING",
            "category": "seo", # fits in technical/seo
            "severity": "MEDIUM",
            "title": "Missing robots.txt File",
            "description": f"No robots.txt file was found at {urljoin(base_url, 'robots.txt')}.",
            "business_impact": "Without robots.txt, web crawlers may index private administration pages or crawl too heavily, causing server stress.",
            "developer_fix": "Create a robots.txt file in your server's root directory specifying index rules.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    # 2. Sitemap.xml
    if not check_site_file(base_url, "sitemap.xml"):
        findings.append({
            "issue_code": "TECH_SITEMAP_MISSING",
            "category": "seo",
            "severity": "MEDIUM",
            "title": "Missing sitemap.xml File",
            "description": f"No sitemap.xml file was found at {urljoin(base_url, 'sitemap.xml')}.",
            "business_impact": "Sitemaps help search engines discover and index new or deep website content quickly.",
            "developer_fix": "Generate an XML sitemap and upload it to your server root. Link it in robots.txt.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    # 3. 404 Page Check
    random_url = urljoin(base_url, "nonexistent-random-page-dcpl-tester")
    try:
        res = requests.get(random_url, timeout=5)
        if res.status_code != 404:
            findings.append({
                "issue_code": "TECH_SOFT_404",
                "category": "navigation",
                "severity": "HIGH",
                "title": "Incorrect 404 Response Status Code (Soft 404)",
                "description": f"A request to a non-existent URL ({random_url}) returned status code {res.status_code} instead of 404.",
                "business_impact": "Returning status 200 for broken URLs causes search engines to index error pages, wasting crawl budgets.",
                "developer_fix": "Configure the web server to return a true HTTP 404 Not Found response header for missing routes.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
    except Exception:
        pass

    return findings
