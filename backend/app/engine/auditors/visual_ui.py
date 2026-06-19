import logging
from bs4 import BeautifulSoup
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def audit_visual_ui_and_branding(page, url: str, soup: BeautifulSoup) -> List[Dict[str, Any]]:
    findings = []
    
    try:
        # Extract visual statistics using Javascript in Playwright
        visual_data = page.evaluate("""() => {
            const fontFamilies = new Set();
            const buttonStyles = [];
            const colors = new Set();
            
            // 1. Gather all fonts and text colors
            const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, li, button');
            allElements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.fontFamily) {
                    // Normalize font family string
                    const firstFont = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                    if (firstFont) fontFamilies.add(firstFont);
                }
                if (style.color) {
                    colors.add(style.color);
                }
            });
            
            // 2. Gather button styles
            const buttons = document.querySelectorAll('button, input[type="submit"], a.btn, a.button');
            buttons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                buttonStyles.push({
                    backgroundColor: style.backgroundColor,
                    borderRadius: style.borderRadius,
                    fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, '').trim()
                });
            });
            
            // 3. Gather touching cards/boxes
            const touchingCards = [];
            const cardCandidates = Array.from(document.querySelectorAll('div, section, article, aside')).filter(el => {
                const style = window.getComputedStyle(el);
                const hasBg = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
                const hasBorder = style.borderStyle !== 'none' && parseFloat(style.borderWidth) > 0;
                const hasShadow = style.boxShadow && style.boxShadow !== 'none';
                const rect = el.getBoundingClientRect();
                return rect.width > 40 && rect.height > 40 && (hasBg || hasBorder || hasShadow);
            });

            for (let i = 0; i < cardCandidates.length; i++) {
                const elA = cardCandidates[i];
                const rectA = elA.getBoundingClientRect();
                for (let j = i + 1; j < cardCandidates.length; j++) {
                    const elB = cardCandidates[j];
                    const rectB = elB.getBoundingClientRect();
                    
                    if (elA.contains(elB) || elB.contains(elA)) continue;
                    
                    const horizontalOverlap = Math.min(rectA.right, rectB.right) > Math.max(rectA.left, rectB.left);
                    if (horizontalOverlap) {
                        const gapAB = rectB.top - rectA.bottom;
                        const gapBA = rectA.top - rectB.bottom;
                        const gap = (gapAB >= -2 && gapAB <= 4) ? gapAB : (gapBA >= -2 && gapBA <= 4) ? gapBA : null;
                        
                        if (gap !== null) {
                            const descA = elA.tagName.toLowerCase() + (elA.className ? '.' + elA.className.trim().split(/\\s+/).join('.') : '');
                            const descB = elB.tagName.toLowerCase() + (elB.className ? '.' + elB.className.trim().split(/\\s+/).join('.') : '');
                            touchingCards.push({
                                elementA: descA.substring(0, 100),
                                elementB: descB.substring(0, 100),
                                gap: Math.round(gap),
                                rectA: { x: Math.round(rectA.left), y: Math.round(rectA.top), w: Math.round(rectA.width), h: Math.round(rectA.height) },
                                rectB: { x: Math.round(rectB.left), y: Math.round(rectB.top), w: Math.round(rectB.width), h: Math.round(rectB.height) }
                            });
                            if (touchingCards.length >= 5) break;
                        }
                    }
                }
                if (touchingCards.length >= 5) break;
            }
            
            return {
                fonts: Array.from(fontFamilies),
                buttonCount: buttons.length,
                buttonStyles: buttonStyles,
                colors: Array.from(colors),
                touchingCards: touchingCards
            };
        }""")
        
        # 1. Font Consistency Check (Typography)
        fonts = visual_data.get("fonts", [])
        if len(fonts) > 3:
            findings.append({
                "issue_code": "VIS_FONT_INCONSISTENCY",
                "category": "branding",
                "severity": "HIGH",
                "title": "Too Many Font Families Used",
                "description": f"Found {len(fonts)} different font families on this page: {', '.join(fonts[:5])}. Standard websites should use at most 2-3 families.",
                "business_impact": "Using too many fonts degrades professional branding, looks cluttered, and impacts readability.",
                "developer_fix": "Consolidate fonts in your CSS design system. Stick to a primary font for headings and secondary font for body text.",
                "confidence": "HIGH",
                "screenshot_reason": "Font consistency issues"
            })
            
        # 2. Button Consistency Check
        btn_styles = visual_data.get("buttonStyles", [])
        if len(btn_styles) > 1:
            # Check for multiple background colors / border radius values
            bg_colors = set(b.get("backgroundColor") for b in btn_styles)
            radii = set(b.get("borderRadius") for b in btn_styles)
            
            if len(bg_colors) > 4 or len(radii) > 3:
                findings.append({
                    "issue_code": "VIS_BUTTON_INCONSISTENCY",
                    "category": "branding",
                    "severity": "HIGH",
                    "title": "Inconsistent Button Styles",
                    "description": f"Detected {len(bg_colors)} different button colors and {len(radii)} border styles on this page. Buttons should have uniform shape and cohesive colors.",
                    "business_impact": "Inconsistent call-to-action buttons dilute brand identity and confuse users about interactive hierarchy.",
                    "developer_fix": "Create a unified button styling class (e.g. .btn-primary) with constant padding, border-radius, and colors.",
                    "confidence": "MEDIUM",
                    "screenshot_reason": "Inconsistent button shapes/colors"
                })

        # 3. Logo Presence Check (Branding)
        # Search for images with "logo" in alt text, filename, class or id
        has_logo = False
        logo_images = soup.find_all("img")
        for img in logo_images:
            alt = img.get("alt", "").lower()
            src = img.get("src", "").lower()
            classes = "".join(img.get("class", [])).lower()
            img_id = img.get("id", "").lower()
            
            if "logo" in alt or "logo" in src or "logo" in classes or "logo" in img_id:
                has_logo = True
                break
                
        # If no logo found in images, check for svg logo
        if not has_logo:
            svgs = soup.find_all("svg")
            for svg in svgs:
                classes = "".join(svg.get("class", [])).lower()
                svg_id = svg.get("id", "").lower()
                if "logo" in classes or "logo" in svg_id:
                    has_logo = True
                    break
                    
        if not has_logo:
            findings.append({
                "issue_code": "BRAND_LOGO_MISSING",
                "category": "branding",
                "severity": "HIGH",
                "title": "Brand Logo Missing",
                "description": "Could not identify a logo image or logo container on this page.",
                "business_impact": "A visible logo in the header is critical for company brand recognition and builds instant trust with users.",
                "developer_fix": "Add the organization's logo inside the website header, wrapping it in an anchor link leading to the homepage.",
                "confidence": "MEDIUM",
                "screenshot_reason": "Logo missing from header"
            })
            
        # 4. Heading Hierarchy (Typography)
        # Let's inspect soup for out-of-order headings (e.g. H3 before H2, H1 missing)
        headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        levels = [int(h.name[1]) for h in headings]
        
        out_of_order = False
        for i in range(len(levels) - 1):
            # Check if we jumped levels down (e.g., H2 to H4, skipping H3)
            if levels[i+1] - levels[i] > 1:
                out_of_order = True
                break
                
        if out_of_order:
            findings.append({
                "issue_code": "TYPO_HEADING_HIERARCHY",
                "category": "branding",
                "severity": "LOW",
                "title": "Broken Heading Hierarchy",
                "description": "Headings on this page skip levels (e.g., heading level 4 immediately follows heading level 2).",
                "business_impact": "Out-of-order headings degrade structure readability and make screen reader navigation confusing.",
                "developer_fix": "Adjust heading tags (h1-h6) sequentially. Do not select heading levels based on visual font sizes.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
        
        # 5. Touching Card/Layout Spacing Check
        touching_cards = visual_data.get("touchingCards", [])
        if touching_cards:
            examples = []
            for item in touching_cards:
                examples.append(f"'{item['elementA']}' and '{item['elementB']}' (gap: {item['gap']}px)")
            
            import json
            rects = []
            for item in touching_cards:
                if "rectA" in item and "rectB" in item:
                    rects.append(item["rectA"])
                    rects.append(item["rectB"])

            findings.append({
                "issue_code": "VIS_LAYOUT_TOUCHING_ELEMENTS",
                "category": "branding",
                "severity": "HIGH",
                "title": "Touching Layout Cards / Zero-Gap Boxes",
                "description": f"Detected {len(touching_cards)} instances where layout cards/boxes are stacked with zero or extremely small spacing (< 4px), making them touch. Examples: {'; '.join(examples[:3])}.",
                "business_impact": "Zero spacing or touching card blocks violate spacing grids, look unpolished/broken, and degrade overall design aesthetics.",
                "developer_fix": "Add appropriate margin or grid/flex spacing between your cards. Ensure a standard gap (e.g. margin-bottom or gap of 16px to 24px) is configured between stacked blocks.",
                "confidence": "HIGH",
                "screenshot_reason": "Touching visual cards",
                "element_coords": json.dumps({"rects": rects})
            })

    except Exception as e:
        logger.error(f"Error auditing visual and branding metrics on {url}: {e}")
        
    return findings
