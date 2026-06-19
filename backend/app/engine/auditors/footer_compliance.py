import logging
from bs4 import BeautifulSoup
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def audit_footer_compliance(page, url: str, soup: BeautifulSoup) -> List[Dict[str, Any]]:
    findings = []
    
    # 1. Search for footer element or elements with footer class/id
    footer_element = soup.find("footer") or soup.find(class_="footer") or soup.find(id="footer")
    
    if not footer_element:
        # If no explicit footer element found, search the body
        footer_element = soup.find("body") or soup
        has_footer_tag = False
    else:
        has_footer_tag = True

    # 2. Check for required text "Powered by Dimakh Consultants" (case-insensitive)
    text_content = footer_element.get_text() if footer_element else ""
    has_text = "dimakh consultants" in text_content.lower()
    
    # 3. Check for link to "https://www.dimakhconsultants.com/"
    target_url = "https://www.dimakhconsultants.com/"
    target_title = "Leading AI-Integrated Digital Agency in Pune, India : Web, Apps & Next-Gen Marketing"
    
    links = footer_element.find_all("a", href=True) if footer_element else []
    matching_link = None
    
    for link in links:
        href = link["href"].strip().rstrip("/")
        normalized_target = target_url.strip().rstrip("/")
        if href == normalized_target or href == normalized_target.replace("https://", "http://"):
            matching_link = link
            break

    # Perform Playwright JS Evaluation for casing, formatting, and positioning
    footer_info = {"found": False}
    try:
        footer_info = page.evaluate("""() => {
            try {
                // Scroll to bottom to ensure footer is positioned correctly relative to viewport
                window.scrollTo(0, document.body.scrollHeight);
                
                // Find all elements containing "dimakh consultants" and "powered by" to target the attribution
                const elements = Array.from(document.querySelectorAll('a, p, span, div, footer')).filter(el => {
                    const text = el.textContent.toLowerCase();
                    if (!text.includes('dimakh consultants') || !text.includes('powered by')) return false;
                    
                    // Check if any child of el also contains both. If so, el is not the innermost element.
                    const hasChildWithBoth = Array.from(el.children).some(child => {
                        const childText = child.textContent.toLowerCase();
                        return childText.includes('dimakh consultants') && childText.includes('powered by');
                    });
                    
                    return !hasChildWithBoth;
                });

                if (elements.length === 0) {
                    return { found: false };
                }

                // Choose the most specific element (smallest width/height)
                elements.sort((a, b) => {
                    const rA = a.getBoundingClientRect();
                    const rB = b.getBoundingClientRect();
                    return (rA.width * rA.height) - (rB.width * rB.height);
                });

                const el = elements[0];
                const rect = el.getBoundingClientRect();
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                // Position validation: bottom right half of the page
                const isRight = rect.left > windowWidth * 0.4;
                const isBottom = rect.top > windowHeight * 0.5;

                return {
                    found: true,
                    text: el.textContent.trim(),
                    isRight: isRight,
                    isBottom: isBottom,
                    rect: {
                        left: Math.round(rect.left),
                        top: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        windowWidth,
                        windowHeight
                    }
                };
            } catch (e) {
                return { found: false, error: e.message };
            }
        }""")
    except Exception as e:
        logger.error(f"Error evaluating footer position on {url}: {e}")
            
    # Check findings
    if not has_footer_tag:
        findings.append({
            "issue_code": "FOOTER_MISSING_TAG",
            "category": "footer",
            "severity": "MEDIUM",
            "title": "Missing Semantic Footer Element",
            "description": "The page does not use a semantic <footer> tag or an element with footer class/id.",
            "business_impact": "Lack of semantic markup reduces SEO indexability and accessibility for screen readers.",
            "developer_fix": "Wrap your footer area in a standard HTML5 <footer> tag.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    if not has_text or not footer_info.get("found"):
        findings.append({
            "issue_code": "FOOTER_TEXT_MISSING",
            "category": "footer",
            "severity": "HIGH",
            "title": "Dimakh Footer Branding Text Missing",
            "description": "Required text ':::| powered by dimakh consultants |:::' was not found on this page.",
            "business_impact": "Dimakh Consultants agency attribution is required on all client site footers.",
            "developer_fix": "Add the text ':::| powered by dimakh consultants |:::' to the bottom-right of the page.",
            "confidence": "HIGH",
            "screenshot_reason": "Dimakh footer text attribution missing"
        })
    else:
        # Check casing and exact format (case-sensitive)
        actual_text = footer_info.get("text", "")
        expected_format = ":::| powered by dimakh consultants |:::"
        
        if actual_text != expected_format:
            findings.append({
                "issue_code": "FOOTER_FORMAT_INCORRECT",
                "category": "footer",
                "severity": "HIGH",
                "title": "Incorrect Format in Footer Attribution",
                "description": f"The footer attribution text must match the exact required format. Found: '{actual_text}', Expected: '{expected_format}'",
                "business_impact": "Incorrect character format or missing decorative bars violates standardized agency footer specifications.",
                "developer_fix": f"Update the footer text to match exactly: '{expected_format}'",
                "confidence": "HIGH",
                "screenshot_reason": "Dimakh footer format incorrect"
            })

        # 3. Position check: bottom right
        if not footer_info.get("isRight") or not footer_info.get("isBottom"):
            rect_info = footer_info.get("rect", {})
            findings.append({
                "issue_code": "FOOTER_POSITION_INCORRECT",
                "category": "footer",
                "severity": "HIGH",
                "title": "Incorrect Footer Placement",
                "description": f"The footer branding attribution must be positioned in the bottom-right corner of the page. Found at coordinates: x={rect_info.get('left', 0)}, y={rect_info.get('top', 0)} on a {rect_info.get('windowWidth', 1280)}x{rect_info.get('windowHeight', 800)} viewport.",
                "business_impact": "Incorrect footer placement violates layout guidelines and harms corporate website design consistency.",
                "developer_fix": "Position the footer attribution in the bottom-right corner of the page (e.g. using CSS styling or container alignments).",
                "confidence": "HIGH",
                "screenshot_reason": "Dimakh footer position incorrect"
            })
        
    if not matching_link:
        findings.append({
            "issue_code": "FOOTER_LINK_MISSING",
            "category": "footer",
            "severity": "CRITICAL",
            "title": "Dimakh Footer Link Missing or Incorrect",
            "description": f"A link to '{target_url}' was not found in the footer.",
            "business_impact": "Required backlinks to the main agency site are missing, impacting SEO and attribution.",
            "developer_fix": f"Add a link with href='{target_url}' in the footer.",
            "confidence": "HIGH",
            "screenshot_reason": "Dimakh footer backlink missing"
        })
    else:
        # Check title attribute on the matching link
        title_attr = matching_link.get("title", "")
        # Normalized checks
        if title_attr.strip() != target_title:
            findings.append({
                "issue_code": "FOOTER_LINK_TITLE_INCORRECT",
                "category": "footer",
                "severity": "HIGH",
                "title": "Incorrect Title Attribute on Dimakh Footer Link",
                "description": f"The Dimakh footer link has an incorrect or missing title attribute. Found: '{title_attr}', Expected: '{target_title}'",
                "business_impact": "Incorrect title attributes on core backlinks weaken keyword-based search engine authority.",
                "developer_fix": f"Set the title attribute on the link to: '{target_title}'",
                "confidence": "HIGH",
                "screenshot_reason": "Dimakh footer link title incorrect"
            })
            
    # 4. Check for copyright year 2026
    import re
    copyright_match = re.search(r"©|copyright|copr\.", text_content, re.IGNORECASE)
    if copyright_match:
        if "2026" not in text_content:
            found_year_match = re.search(r"\b(20\d{2})\b", text_content)
            found_year = found_year_match.group(1) if found_year_match else "None"
            findings.append({
                "issue_code": "FOOTER_COPYRIGHT_OUTDATED",
                "category": "footer",
                "severity": "MEDIUM",
                "title": "Outdated Copyright Year in Footer",
                "description": f"A copyright notice was found in the footer, but it does not reference the current year (2026). Found: '{found_year}'",
                "business_impact": "An outdated copyright year signals to users that the website is not actively maintained, reducing user trust and brand credibility.",
                "developer_fix": "Update the copyright notice in the footer to include '2026'. Consider using a dynamic date script to prevent future expiration.",
                "confidence": "HIGH",
                "screenshot_reason": "Outdated footer copyright notice"
            })
            
    return findings
