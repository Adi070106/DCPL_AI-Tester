import logging
from bs4 import BeautifulSoup
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Common placeholder terms
PLACEHOLDER_WORDS = ["lorem ipsum", "lorem", "ipsum dolor", "placeholder text", "dummy text", "todo:", "test text"]

def audit_content_and_images(page, url: str, soup: BeautifulSoup) -> List[Dict[str, Any]]:
    findings = []
    
    # 1. Placeholder Text Check
    body_text = soup.get_text().lower()
    found_placeholders = []
    for word in PLACEHOLDER_WORDS:
        if word in body_text:
            found_placeholders.append(word)
            
    if found_placeholders:
        findings.append({
            "issue_code": "CONTENT_PLACEHOLDER_TEXT",
            "category": "content",
            "severity": "MEDIUM",
            "title": f"Placeholder Text Found",
            "description": f"Detected placeholder or template text (e.g., '{', '.join(found_placeholders)}') on the page.",
            "business_impact": "Leaving filler text like Lorem Ipsum makes the site look unfinished, damages credibility, and harms brand trust.",
            "developer_fix": "Replace all temporary placeholder strings and templates with final copy before deployment.",
            "confidence": "HIGH",
            "screenshot_reason": None
        })

    # 2. Empty Sections Check
    # Look for div/section blocks that are completely empty or have just spacing
    sections = soup.find_all(["section", "article", "div"], class_=lambda c: c and any(w in str(c).lower() for w in ["content", "section", "block", "container"]))
    empty_count = 0
    for sec in sections:
        # Check if the block has text or images or interactive elements
        text = sec.get_text().strip()
        media = sec.find_all(["img", "svg", "video", "iframe"])
        if not text and not media:
            empty_count += 1
            if empty_count >= 3:  # limit reporting to avoid noise
                break
                
    if empty_count > 0:
        findings.append({
            "issue_code": "CONTENT_EMPTY_SECTION",
            "category": "content",
            "severity": "LOW",
            "title": "Empty Content Sections Detected",
            "description": "Detected empty divisions or sections on the page containing no text or media elements.",
            "business_impact": "Blank page sections waste screen space and make the design look broken or misaligned.",
            "developer_fix": "Remove empty elements or populate them with relevant copy/images. Clean up unused empty container classes.",
            "confidence": "MEDIUM",
            "screenshot_reason": None
        })

    # 3. Distorted Images Check using Playwright runtime
    try:
        distorted_images = page.evaluate("""() => {
            const distorted = [];
            const imgs = document.querySelectorAll('img');
            imgs.forEach(img => {
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    const rect = img.getBoundingClientRect();
                    if (rect.width > 10 && rect.height > 10) {
                        const naturalRatio = img.naturalWidth / img.naturalHeight;
                        const renderedRatio = rect.width / rect.height;
                        // Tolerating 15% ratio difference
                        if (Math.abs(naturalRatio - renderedRatio) / naturalRatio > 0.15) {
                            distorted.push({
                                src: img.src,
                                natural: `${img.naturalWidth}x${img.naturalHeight} (Ratio: ${naturalRatio.toFixed(2)})`,
                                rendered: `${Math.round(rect.width)}x${Math.round(rect.height)} (Ratio: ${renderedRatio.toFixed(2)})`
                            });
                        }
                    }
                }
            });
            return distorted;
        }""")
        
        if distorted_images:
            img_list = ", ".join([f"'{d['src'].split('/')[-1]}' (Expected ratio {d['natural']}, found {d['rendered']})" for d in distorted_images[:3]])
            findings.append({
                "issue_code": "MEDIA_DISTORTED_IMAGE",
                "category": "content",
                "severity": "HIGH",
                "title": f"Distorted Images Detected ({len(distorted_images)} images)",
                "description": f"The following images are visually distorted (stretched or squeezed): {img_list}.",
                "business_impact": "Distorted layout graphics significantly lower brand professionalism, conveying poor attention to detail.",
                "developer_fix": "Add aspect-ratio properties (e.g. object-fit: cover or aspect-ratio: auto) to your image styles in CSS.",
                "confidence": "HIGH",
                "screenshot_reason": "Visual distortion on images"
            })
            
    except Exception as e:
        logger.error(f"Error checking distorted images on {url}: {e}")

    # 4. Broken Images Check (BeautifulSoup request or Playwright naturalWidth)
    try:
        broken_images = page.evaluate("""() => {
            const broken = [];
            const imgs = document.querySelectorAll('img');
            imgs.forEach(img => {
                // If loaded but naturalWidth is 0, it failed to load
                if (img.complete && img.naturalWidth === 0) {
                    broken.push(img.src);
                }
            });
            return broken;
        }""")
        
        if broken_images:
            findings.append({
                "issue_code": "MEDIA_BROKEN_IMAGE",
                "category": "content",
                "severity": "HIGH",
                "title": f"Broken Images Detected ({len(broken_images)} images)",
                "description": "The following images failed to load: " + ", ".join([b.split('/')[-1] for b in broken_images[:3]]),
                "business_impact": "Broken image icons indicate missing files or server issues, ruining the visual presentation.",
                "developer_fix": "Ensure all image files exist on the server and check their path references.",
                "confidence": "HIGH",
                "screenshot_reason": "Broken image tag detected"
            })
            
    except Exception as e:
        logger.error(f"Error checking broken images on {url}: {e}")

    return findings
