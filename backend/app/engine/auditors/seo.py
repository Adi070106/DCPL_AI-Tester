import logging
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def audit_seo(page, url: str, soup: BeautifulSoup) -> List[Dict[str, Any]]:
    findings = []
    
    # 1. Title Tag
    title_tag = soup.find("title")
    if not title_tag or not title_tag.get_text().strip():
        findings.append({
            "issue_code": "SEO_TITLE_MISSING",
            "category": "seo",
            "severity": "HIGH",
            "title": "Missing Title Tag",
            "description": "This page does not have a <title> tag, or the title tag is empty.",
            "business_impact": "Search engines display page titles in search results. Missing titles severely hurt CTR and search rankings.",
            "developer_fix": "Add a descriptive <title> tag in the <head> block, between 50-60 characters.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })
    else:
        title_text = title_tag.get_text().strip()
        if len(title_text) < 10:
            findings.append({
                "issue_code": "SEO_TITLE_TOO_SHORT",
                "category": "seo",
                "severity": "LOW",
                "title": "Title Tag Too Short",
                "description": f"The title tag is too short ({len(title_text)} characters). Title: '{title_text}'",
                "business_impact": "Short titles fail to describe page content, reducing keywords indexed and search engine relevance.",
                "developer_fix": "Expand the title tag to be more descriptive, incorporating primary keywords.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
        elif len(title_text) > 60:
            findings.append({
                "issue_code": "SEO_TITLE_TOO_LONG",
                "category": "seo",
                "severity": "LOW",
                "title": "Title Tag Too Long",
                "description": f"The title tag is too long ({len(title_text)} characters). Title: '{title_text}'",
                "business_impact": "Search engines truncate titles longer than 60 characters in search results, making snippets look cut off.",
                "developer_fix": "Shorten the title tag to keep it within 50-60 characters.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })

    # 2. Meta Description
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if not meta_desc or not meta_desc.get("content", "").strip():
        findings.append({
            "issue_code": "SEO_META_DESC_MISSING",
            "category": "seo",
            "severity": "HIGH",
            "title": "Missing Meta Description",
            "description": "This page does not have a meta description tag, or the content is empty.",
            "business_impact": "Meta descriptions are shown in search snippet descriptions. Missing them reduces organic CTR.",
            "developer_fix": "Add a <meta name='description' content='...'> tag in the <head> with a summary of the page (150-160 characters).",
            "confidence": "HIGH",
            "screenshot_reason": None
        })
    else:
        desc_text = meta_desc.get("content", "").strip()
        if len(desc_text) < 50:
            findings.append({
                "issue_code": "SEO_META_DESC_TOO_SHORT",
                "category": "seo",
                "severity": "LOW",
                "title": "Meta Description Too Short",
                "description": f"The meta description is too short ({len(desc_text)} characters).",
                "business_impact": "Short summaries do not provide enough context to searchers, reducing click-through rates.",
                "developer_fix": "Rewrite the meta description to be between 120 and 160 characters.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
        elif len(desc_text) > 160:
            findings.append({
                "issue_code": "SEO_META_DESC_TOO_LONG",
                "category": "seo",
                "severity": "LOW",
                "title": "Meta Description Too Long",
                "description": f"The meta description is too long ({len(desc_text)} characters).",
                "business_impact": "Search engines truncate description snippets longer than 160 characters.",
                "developer_fix": "Keep your meta descriptions concise and within 120-160 characters.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })

    # 3. Heading Structure (H1)
    h1s = soup.find_all("h1")
    if len(h1s) == 0:
        findings.append({
            "issue_code": "SEO_H1_MISSING",
            "category": "seo",
            "severity": "HIGH",
            "title": "Missing H1 Heading",
            "description": "The page does not contain any <h1> tags.",
            "business_impact": "The <h1> tag is the primary structural heading. Missing H1 makes it difficult for crawlers to understand page hierarchy.",
            "developer_fix": "Add a single <h1> heading representing the page's main topic.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })
    elif len(h1s) > 1:
        findings.append({
            "issue_code": "SEO_H1_MULTIPLE",
            "category": "seo",
            "severity": "MEDIUM",
            "title": "Multiple H1 Headings",
            "description": f"Found {len(h1s)} <h1> tags on the page. Only one is recommended.",
            "business_impact": "Multiple H1 tags dilute keyword focus and can confuse search crawler heading indexing.",
            "developer_fix": "Use exactly one <h1> tag for the main title, and demote others to <h2> or <h3>.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    # 4. Image Alt Tags
    images = soup.find_all("img")
    missing_alt_count = 0
    for img in images:
        if not img.has_attr("alt") or not img["alt"].strip():
            missing_alt_count += 1
            
    if missing_alt_count > 0:
        findings.append({
            "issue_code": "SEO_IMG_ALT_MISSING",
            "category": "seo",
            "severity": "MEDIUM",
            "title": "Images Missing Alt Attributes",
            "description": f"Found {missing_alt_count} images without 'alt' text.",
            "business_impact": "Images without alt text cannot be indexed by search engine image search and are inaccessible to screen readers.",
            "developer_fix": "Add descriptive 'alt' attributes to all images, or leave them empty (alt='') for purely decorative images.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    # 5. Canonical Tag
    canonical = soup.find("link", rel="canonical")
    if not canonical or not canonical.get("href", "").strip():
        findings.append({
            "issue_code": "SEO_CANONICAL_MISSING",
            "category": "seo",
            "severity": "MEDIUM",
            "title": "Missing Canonical Tag",
            "description": "No canonical tag (<link rel='canonical' href='...'>) found on the page.",
            "business_impact": "Canonical tags prevent duplicate content issues when search engines crawl multiple URL paths.",
            "developer_fix": "Add a canonical link pointing to the preferred URL for this page.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    # 6. URL Cleanliness
    parsed_url = urlparse(url)
    query = parsed_url.query
    if query and ("sid=" in query.lower() or "sessionid=" in query.lower() or len(query.split("&")) > 4):
        findings.append({
            "issue_code": "SEO_URL_UNCLEAN",
            "category": "seo",
            "severity": "LOW",
            "title": "Unclean URL Parameters Detected",
            "description": "URL contains potentially duplicate parameters or session identifiers.",
            "business_impact": "URLs with session tracking IDs can cause search engines to index duplicate pages, fragmenting link equity.",
            "developer_fix": "Implement clean paths or canonical headers, and manage session state via cookies rather than query arguments.",
            "confidence": "MEDIUM",
            "screenshot_reason": None
        })

    return findings
