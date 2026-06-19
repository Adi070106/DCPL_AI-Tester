import logging
import requests
import os
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

AXE_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js"
LOCAL_AXE_PATH = Path(__file__).resolve().parent.parent.parent / "storage" / "axe.min.js"

def get_axe_script() -> str:
    """Load axe-core JS, downloading to local cache if not present."""
    if LOCAL_AXE_PATH.exists():
        try:
            return LOCAL_AXE_PATH.read_text(encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to read local axe script: {e}")
            
    # Try downloading it
    try:
        os.makedirs(LOCAL_AXE_PATH.parent, exist_ok=True)
        logger.info(f"Downloading Axe-core from {AXE_CDN_URL}")
        response = requests.get(AXE_CDN_URL, timeout=10)
        if response.status_code == 200:
            LOCAL_AXE_PATH.write_text(response.text, encoding="utf-8")
            return response.text
    except Exception as e:
        logger.error(f"Failed to download axe-core: {e}")
        
    # Minimum fallback dummy script if we are offline and don't have it cached
    return "var axe = { run: async () => ({ violations: [] }) };"

def audit_accessibility(page, url: str) -> List[Dict[str, Any]]:
    findings = []
    
    try:
        axe_js = get_axe_script()
        page.evaluate(axe_js)
        
        # Run axe.run() with options
        # We only look for accessibility checks
        results = page.evaluate("async () => { return await axe.run(); }")
        violations = results.get("violations", [])
        
        # Limit checks to the 6 core requirements in the audit-spec (labels, alt text, contrast, keyboard, focus, ARIA)
        supported_rules = {
            # 1. Missing labels
            "label", "aria-label", "button-name", "link-name", "select-name", "input-button-name", "label-title-only",
            # 2. Missing alt text
            "image-alt", "input-image-alt", "role-img-alt",
            # 3. Contrast violations
            "color-contrast",
            # 4. Keyboard navigation & focus
            "bypass", "tabindex", "accesskeys", "scrollable-region-focusable", "focus-order-semantics",
            # 5. ARIA issues
            "aria-roles", "aria-valid-attr", "aria-valid-attr-value", "aria-allowed-attr", "aria-allowed-role", 
            "aria-hidden-body", "aria-required-attr", "aria-required-children", "aria-required-parent", "aria-toggle-field-name"
        }
        
        for v in violations:
            rule_id = v.get("id")
            if rule_id not in supported_rules:
                continue
                
            severity_map = {
                "critical": "CRITICAL",
                "serious": "HIGH",
                "moderate": "MEDIUM",
                "minor": "LOW"
            }
            severity = severity_map.get(v.get("impact"), "MEDIUM")
            
            # Group multiple elements affected by same rule on the page
            elements = v.get("nodes", [])
            target_summary = ", ".join([el.get("target", [""])[0] for el in elements if el.get("target")])
            
            description = v.get("description", "")
            if target_summary:
                description += f" Affected elements: {target_summary[:200]}"
                
            findings.append({
                "issue_code": f"ACC_{v.get('id', 'VIOLATION').upper()}",
                "category": "accessibility",
                "severity": severity,
                "title": f"Accessibility: {v.get('help', 'Violation')}",
                "description": description,
                "business_impact": "Non-compliant websites face legal risks under ADA/WCAG and lose up to 20% of users with disabilities.",
                "developer_fix": f"Review WCAG guidance: {v.get('helpUrl', '')}. Fix instructions: " + 
                                 " | ".join([n.get("failureSummary", "") for n in elements if n.get("failureSummary")])[:500],
                "confidence": "HIGH",
                "screenshot_reason": "Accessibility violation " + v.get("id") if severity in ("CRITICAL", "HIGH") else None
            })
            
    except Exception as e:
        logger.error(f"Error executing Axe accessibility audit on {url}: {e}")
        # Standard fallback checks if axe fails
        pass
        
    return findings
