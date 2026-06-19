import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Cache status to prevent duplicate requests across pages
SOCIAL_LINK_CACHE = {}

def check_social_link_status(url: str) -> int:
    """Check if the social media link is working (returns HTTP status)."""
    if url in SOCIAL_LINK_CACHE:
        return SOCIAL_LINK_CACHE[url]
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    try:
        # GET request is safer and more reliable for social media profile parsing
        res = requests.get(url, headers=headers, allow_redirects=True, timeout=8)
        status = res.status_code
        
        # If it returns 200 but is Facebook or Instagram, inspect the parsed HTML title
        if status == 200:
            url_lower = url.lower()
            if "facebook.com" in url_lower or "fb.com" in url_lower:
                soup = BeautifulSoup(res.text, "html.parser")
                title = soup.title.string.strip() if soup.title else ""
                # Dead profile / login walls on Facebook display "Facebook" or language equivalents
                if title.lower() in ("facebook", "log into facebook", "log in", "लॉग इन करा", "लॉग इन करें"):
                    status = 404
            elif "instagram.com" in url_lower:
                soup = BeautifulSoup(res.text, "html.parser")
                title = soup.title.string.strip() if soup.title else ""
                # Instagram login walls / dead profiles show "Instagram"
                if title.lower() == "instagram":
                    status = 404
    except Exception as ex:
        logger.debug(f"Social link check exception for {url}: {ex}")
        status = 999  # connection/DNS failed
        
    SOCIAL_LINK_CACHE[url] = status
    return status

def is_social_platform_link(href: str) -> bool:
    """Check if the href points to a social media platform."""
    href_lower = href.lower()
    social_domains = [
        "facebook.com", "fb.com", "fb.me",
        "twitter.com", "x.com",
        "linkedin.com",
        "instagram.com",
        "youtube.com", "youtu.be",
        "pinterest.com",
        "tiktok.com"
    ]
    return any(domain in href_lower for domain in social_domains)

def audit_social_media(page, url: str, soup: BeautifulSoup) -> List[Dict[str, Any]]:
    findings = []
    
    # 1. Extract all <a> tags
    links = soup.find_all("a")
    
    detected_social_links = []
    placeholder_social_links = []
    
    social_keywords = ["facebook", "twitter", "linkedin", "instagram", "youtube", "pinterest", "tiktok", "x.com"]
    
    for link in links:
        href = link.get("href", "").strip()
        text = link.get_text().strip()
        
        # Check if the href itself is a social media link
        if href and is_social_platform_link(href):
            parsed = urlparse(href)
            path = parsed.path.strip("/")
            
            # Base domain without specific profile or company path is a placeholder link
            is_placeholder = False
            if not path or path.lower() in ("home", "share", "sharer", "sharer.php", "intent", "tweet"):
                is_placeholder = True
            elif any(placeholder in path.lower() for placeholder in ["yourusername", "yourprofile", "username", "companyname", "placeholder", "yourpage"]):
                is_placeholder = True
                
            if is_placeholder:
                placeholder_social_links.append((href, "Base domain / Placeholder path"))
            else:
                detected_social_links.append((href, text or href))
                
        # If the href is empty or placeholder (#), check if the element has social media context
        elif href in ("", "#", "javascript:void(0)", "javascript:;"):
            classes = link.get("class", [])
            class_str = " ".join(classes).lower()
            title = link.get("title", "").lower()
            
            child_context = ""
            for child in link.descendants:
                if child.name == "img":
                    child_context += " " + child.get("alt", "").lower()
                    child_context += " " + " ".join(child.get("class", [])).lower()
                elif child.name == "svg":
                    child_context += " " + " ".join(child.get("class", [])).lower()
                    
            combined_context = f"{class_str} {title} {child_context}"
            
            matched_keyword = next((kw for kw in social_keywords if kw in combined_context), None)
            if matched_keyword:
                placeholder_social_links.append(("#", f"Placeholder social button for {matched_keyword.capitalize()}"))

    # 2. Test detected social media links for brokenness (HTTP 404/400 or connection failures)
    broken_social_links = []
    for href, link_text in detected_social_links:
        absolute_url = urljoin(url, href)
        status = check_social_link_status(absolute_url)
        
        if status in (404, 400):
            broken_social_links.append(f"{absolute_url} (HTTP {status})")
        elif status == 999:
            broken_social_links.append(f"{absolute_url} (Connection Failed)")

    # 3. Add findings for placeholders
    if placeholder_social_links:
        placeholder_details = []
        for h, reason in placeholder_social_links:
            placeholder_details.append(f"'{h}' ({reason})")
            
        findings.append({
            "issue_code": "NAV_SOCIAL_LINK_PLACEHOLDER",
            "category": "navigation",
            "severity": "HIGH",
            "title": "Unconfigured Social Media Links",
            "description": "We detected social media icon buttons or links that point to placeholder targets or base domains: " + " | ".join(placeholder_details[:4]),
            "business_impact": "Placeholder social media links look unprofessional, frustrate users, and miss opportunities to grow social channel audience.",
            "developer_fix": "Update the anchor href attributes in the header/footer to point to the active company profiles.",
            "confidence": "HIGH",
            "screenshot_reason": "Placeholder social media link detected"
        })

    # 4. Add findings for broken links
    if broken_social_links:
        findings.append({
            "issue_code": "NAV_SOCIAL_LINK_BROKEN",
            "category": "navigation",
            "severity": "CRITICAL",
            "title": f"Broken Social Media Profile Links ({len(broken_social_links)} links)",
            "description": "The following social media profile pages could not be found: " + " | ".join(broken_social_links[:3]),
            "business_impact": "Broken social media links lead users to error pages, hurting brand credibility and SEO integrity.",
            "developer_fix": "Verify the profile URLs on the respective platforms and correct the href attributes.",
            "confidence": "HIGH",
            "screenshot_reason": "Broken social media link detected"
        })
        
    return findings
