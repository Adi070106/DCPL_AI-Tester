import logging
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def audit_security(page, url: str, response_headers: Dict[str, str], soup: BeautifulSoup) -> List[Dict[str, Any]]:
    findings = []
    
    # Normalize header keys to lowercase
    headers = {k.lower(): v for k, v in response_headers.items()}
    
    # 1. HTTPS Check
    parsed = urlparse(url)
    is_https = parsed.scheme.lower() == "https"
    
    if not is_https:
        findings.append({
            "issue_code": "SEC_NO_HTTPS",
            "category": "security",
            "severity": "CRITICAL",
            "title": "Website Lacks HTTPS Encryption",
            "description": f"The page is loaded over insecure HTTP connection: {url}.",
            "business_impact": "Insecure connections expose user passwords, forms, and session cookies to sniffing and MITM attacks.",
            "developer_fix": "Obtain an SSL/TLS certificate (e.g. from Let's Encrypt) and force HTTP to HTTPS redirection.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })
    else:
        # 2. Mixed Content Check (only applicable on HTTPS sites)
        mixed_resources = []
        tags_to_check = [
            ("img", "src"), ("script", "src"), ("link", "href"), 
            ("iframe", "src"), ("video", "src"), ("audio", "src")
        ]
        
        for tag, attr in tags_to_check:
            elements = soup.find_all(tag, **{attr: True})
            for el in elements:
                val = el[attr].strip()
                if val.lower().startswith("http://"):
                    mixed_resources.append(f"<{tag} {attr}='{val}'>")
                    
        if mixed_resources:
            findings.append({
                "issue_code": "SEC_MIXED_CONTENT",
                "category": "security",
                "severity": "HIGH",
                "title": f"Mixed Content Detected ({len(mixed_resources)} resources)",
                "description": "Page loaded over HTTPS but contains resources loaded over insecure HTTP: " + ", ".join(mixed_resources[:3]),
                "business_impact": "Modern browsers block mixed active content, rendering scripts/stylesheets broken, and warn users about mixed passive content.",
                "developer_fix": "Update all local asset resource links to use relative paths, protocol-relative links (//), or explicit https://.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })

    # 3. Security Headers Checks
    # HSTS
    if is_https and "strict-transport-security" not in headers:
        findings.append({
            "issue_code": "SEC_HSTS_MISSING",
            "category": "security",
            "severity": "MEDIUM",
            "title": "Strict-Transport-Security (HSTS) Header Missing",
            "description": "The HSTS header was not returned in the server response.",
            "business_impact": "Without HSTS, attackers can perform SSL stripping attacks by intercepting initial HTTP redirection.",
            "developer_fix": "Configure your server to send the Strict-Transport-Security header (e.g. max-age=31536000; includeSubDomains).",
            "confidence": "HIGH",
            "screenshot_reason": None
        })
        
    # Content Security Policy (CSP)
    if "content-security-policy" not in headers:
        findings.append({
            "issue_code": "SEC_CSP_MISSING",
            "category": "security",
            "severity": "MEDIUM",
            "title": "Content-Security-Policy (CSP) Header Missing",
            "description": "The CSP header was not returned in the server response.",
            "business_impact": "Without CSP, the site is highly vulnerable to Cross-Site Scripting (XSS) and data injection attacks.",
            "developer_fix": "Implement a Content-Security-Policy header defining allowed sources for scripts, styles, and other assets.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })
        
    # X-Frame-Options
    if "x-frame-options" not in headers and "frame-ancestors" not in headers.get("content-security-policy", ""):
        findings.append({
            "issue_code": "SEC_XFRAME_MISSING",
            "category": "security",
            "severity": "LOW",
            "title": "X-Frame-Options Header Missing",
            "description": "Neither X-Frame-Options nor CSP frame-ancestors headers are present.",
            "business_impact": "Missing clickjacking protection allows malicious sites to load your application in an iframe to steal clicks.",
            "developer_fix": "Set X-Frame-Options: SAMEORIGIN or use CSP frame-ancestors 'self' header.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })
        
    # X-Content-Type-Options
    if "x-content-type-options" not in headers:
        findings.append({
            "issue_code": "SEC_XCONTENT_TYPE_MISSING",
            "category": "security",
            "severity": "LOW",
            "title": "X-Content-Type-Options Header Missing",
            "description": "The X-Content-Type-Options header was not set to 'nosniff'.",
            "business_impact": "Allows browsers to MIME-sniff response content, opening vectors for drive-by downloads or XSS via uploaded assets.",
            "developer_fix": "Configure the web server to send: X-Content-Type-Options: nosniff.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    return findings

def check_ssl(hostname: str) -> dict:
    import socket
    import ssl
    from datetime import datetime
    
    context = ssl.create_default_context()
    try:
        with socket.create_connection((hostname, 443), timeout=4) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                not_after_str = cert.get('notAfter')
                issuer = dict(x[0] for x in cert.get('issuer', []))
                common_name = issuer.get('commonName', 'Unknown')
                organization = issuer.get('organizationName', common_name)
                
                if not_after_str:
                    expiry_date = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
                    days_remaining = (expiry_date - datetime.utcnow()).days
                    return {
                        "valid": True,
                        "issuer": organization,
                        "expiry": expiry_date.isoformat() + "Z",
                        "days_remaining": days_remaining,
                        "error": None
                    }
    except ssl.SSLCertVerificationError as ssl_err:
        err_msg = str(ssl_err)
        is_expired = "expired" in err_msg.lower() or "certificate has expired" in err_msg.lower()
        return {
            "valid": False,
            "issuer": "Unknown (Invalid cert)",
            "expiry": None,
            "days_remaining": -1 if is_expired else 0,
            "error": f"SSL verification failed: {err_msg}"
        }
    except Exception as e:
        return {
            "valid": False,
            "issuer": "None",
            "expiry": None,
            "days_remaining": 0,
            "error": str(e)
        }
    return {
        "valid": False,
        "issuer": "None",
        "expiry": None,
        "days_remaining": 0,
        "error": "Could not establish SSL connection"
    }

def audit_security_scorecard(url: str, response_headers: dict) -> dict:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    is_https = parsed.scheme.lower() == "https"
    
    headers = {k.lower(): v for k, v in response_headers.items()}
    
    if is_https and hostname:
        ssl_info = check_ssl(hostname)
    else:
        ssl_info = {
            "valid": False,
            "issuer": "None",
            "expiry": None,
            "days_remaining": 0,
            "error": "Connection is not secure (HTTP)"
        }
        
    hsts_present = "strict-transport-security" in headers
    csp_present = "content-security-policy" in headers
    xframe_present = "x-frame-options" in headers or "frame-ancestors" in headers.get("content-security-policy", "")
    xcontent_present = "x-content-type-options" in headers
    
    score = 100
    if not is_https:
        score -= 50
    if not ssl_info["valid"] and is_https:
        score -= 30
    if not hsts_present:
        score -= 20
    if not csp_present:
        score -= 20
    if not xframe_present:
        score -= 10
    if not xcontent_present:
        score -= 5
        
    score = max(0, score)
    
    if score >= 95:
        grade = "A+"
    elif score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    elif score >= 60:
        grade = "D"
    else:
        grade = "F"
        
    return {
        "ssl_valid": ssl_info["valid"],
        "ssl_issuer": ssl_info["issuer"],
        "ssl_expiry": ssl_info["expiry"],
        "ssl_days_remaining": ssl_info["days_remaining"],
        "ssl_error": ssl_info["error"],
        "security_headers_grade": grade,
        "security_headers_score": score,
        "headers_present": [h for h in ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"] if h in headers],
        "headers_missing": [h for h in ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"] if h not in headers]
    }

