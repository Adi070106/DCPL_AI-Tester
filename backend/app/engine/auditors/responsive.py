import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def audit_responsive(page, url: str) -> List[Dict[str, Any]]:
    findings = []
    
    viewports = [
        # Desktop Displays
        {"name": "Ultra-Wide Desktop (2560x1440)", "width": 2560, "height": 1440, "type": "desktop"},
        {"name": "Full HD Desktop (1920x1080)", "width": 1920, "height": 1080, "type": "desktop"},
        {"name": "Standard Laptop (1440x900)", "width": 1440, "height": 900, "type": "desktop"},
        {"name": "Common Laptop (1366x768)", "width": 1366, "height": 768, "type": "desktop"},
        {"name": "Old Desktop / Netbook (1024x768)", "width": 1024, "height": 768, "type": "desktop"},

        # Tablets / Smart Displays (Portrait)
        {"name": "iPad Pro Portrait (1024x1366)", "width": 1024, "height": 1366, "type": "tablet"},
        {"name": "iPad Air Portrait (820x1180)", "width": 820, "height": 1180, "type": "tablet"},
        {"name": "iPad Mini Portrait (768x1024)", "width": 768, "height": 1024, "type": "tablet"},
        {"name": "Nest Hub Max (1280x800)", "width": 1280, "height": 800, "type": "tablet"},
        {"name": "Nest Hub (1024x600)", "width": 1024, "height": 600, "type": "tablet"},

        # Tablets / Smart Displays (Landscape)
        {"name": "Samsung Galaxy Tab S7 Landscape (1600x1000)", "width": 1600, "height": 1000, "type": "tablet_landscape"},
        {"name": "iPad Pro Landscape (1366x1024)", "width": 1366, "height": 1024, "type": "tablet_landscape"},
        {"name": "iPad Air Landscape (1180x820)", "width": 1180, "height": 820, "type": "tablet_landscape"},
        {"name": "iPad Mini Landscape (1024x768)", "width": 1024, "height": 768, "type": "tablet_landscape"},
        {"name": "Nexus 7 / 7-inch Tablet Landscape (960x600)", "width": 960, "height": 600, "type": "tablet_landscape"},

        # Mobile Phones (Portrait)
        {"name": "iPhone 14/15 Pro Max Portrait (430x932)", "width": 430, "height": 932, "type": "mobile"},
        {"name": "Pixel 7 / Android Portrait (412x915)", "width": 412, "height": 915, "type": "mobile"},
        {"name": "iPhone XR/XS Max Portrait (414x896)", "width": 414, "height": 896, "type": "mobile"},
        {"name": "Pixel 5 Portrait (393x851)", "width": 393, "height": 851, "type": "mobile"},
        {"name": "iPhone 12/13/14 Pro Portrait (390x844)", "width": 390, "height": 844, "type": "mobile"},
        {"name": "iPhone SE / 8 Portrait (375x667)", "width": 375, "height": 667, "type": "mobile"},
        {"name": "Samsung Galaxy S8+ Portrait (360x740)", "width": 360, "height": 740, "type": "mobile"},
        {"name": "Galaxy Fold Portrait (Folded: 280x653)", "width": 280, "height": 653, "type": "mobile"},

        # Mobile Phones (Landscape)
        {"name": "iPhone 14/15 Pro Max Landscape (932x430)", "width": 932, "height": 430, "type": "mobile_landscape"},
        {"name": "Pixel 7 / Android Landscape (915x412)", "width": 915, "height": 412, "type": "mobile_landscape"},
        {"name": "iPhone XR/XS Max Landscape (896x414)", "width": 896, "height": 414, "type": "mobile_landscape"},
        {"name": "Pixel 5 Landscape (851x393)", "width": 851, "height": 393, "type": "mobile_landscape"},
        {"name": "iPhone 12/13/14 Pro Landscape (844x390)", "width": 844, "height": 390, "type": "mobile_landscape"},
        {"name": "Small Android / Moto G Landscape (820x412)", "width": 820, "height": 412, "type": "mobile_landscape"},
        {"name": "iPhone SE / 8 Landscape (667x375)", "width": 667, "height": 375, "type": "mobile_landscape"},
        {"name": "Samsung Galaxy S8+ Landscape (740x360)", "width": 740, "height": 360, "type": "mobile_landscape"},
        {"name": "Galaxy Fold Landscape (Folded: 653x280)", "width": 653, "height": 280, "type": "mobile_landscape"},
    ]
    
    # Store original viewport to restore it later
    original_size = page.viewport_size
    failed_categories = set()
    
    try:
        for vp in viewports:
            vp_type = vp["type"]
            # Skip if we already logged a failure for this device category on this page
            if vp_type in failed_categories:
                continue
                
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            # Let layout recalculate
            page.wait_for_timeout(200)
            
            # Check for horizontal scrolling/overflow
            overflow_data = page.evaluate("""() => {
                const scrollWidth = document.documentElement.scrollWidth;
                const innerWidth = window.innerWidth;
                const hasOverflow = scrollWidth > innerWidth + 2; // tolerating 2px zoom/subpixel issues
                
                // Try to find the overflowing element
                let overflowingElement = "";
                if (hasOverflow) {
                    const allElements = document.querySelectorAll('*');
                    for (const el of allElements) {
                        const rect = el.getBoundingClientRect();
                        if (rect.right > innerWidth + 2) {
                            overflowingElement = el.tagName + (el.className ? '.' + el.className.split(' ').join('.') : '') + (el.id ? '#' + el.id : '');
                            break;
                        }
                    }
                }
                
                return { hasOverflow, scrollWidth, innerWidth, overflowingElement };
            }""")
            
            if overflow_data.get("hasOverflow"):
                # Track failure category to skip other viewports of this type
                failed_categories.add(vp_type)
                
                el_desc = f" (Likely caused by: {overflow_data['overflowingElement']})" if overflow_data.get("overflowingElement") else ""
                findings.append({
                    "issue_code": f"RESP_HORIZONTAL_SCROLL_{vp_type.upper()}",
                    "category": "responsiveness",
                    "severity": "HIGH",
                    "title": f"Horizontal Scroll on {vp['name']}",
                    "description": f"The page contents overflowed horizontally on a width of {vp['width']}px (Content width: {overflow_data['scrollWidth']}px).{el_desc}",
                    "business_impact": "Horizontal scrolling on mobile/tablet viewports breaks mobile-friendly layout standards, frustrating users and negatively impacting SEO rankings.",
                    "developer_fix": "Add viewport meta tag (width=device-width, initial-scale=1), ensure CSS elements do not use hardcoded pixel widths, and use overflow-x: hidden on the body/container where appropriate.",
                    "confidence": "HIGH",
                    "screenshot_reason": f"Horizontal layout overflow at {vp['width']}px"
                })
                # Break early to avoid duplicate screenshot taking for same-type device overflow
                # e.g., if one mobile viewport fails, we don't need all mobile viewports to trigger screenshots
                
    except Exception as e:
        logger.error(f"Error auditing responsive layouts on {url}: {e}")
        
    finally:
        # Restore original viewport size
        if original_size:
            try:
                page.set_viewport_size(original_size)
            except Exception:
                pass
                
    return findings
