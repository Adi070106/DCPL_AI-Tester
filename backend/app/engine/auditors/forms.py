import logging
from bs4 import BeautifulSoup
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def audit_forms(page, url: str, soup: BeautifulSoup) -> List[Dict[str, Any]]:
    findings = []
    
    forms = soup.find_all("form")
    for idx, form in enumerate(forms):
        form_id = form.get("id") or form.get("name") or f"Index {idx}"
        
        # 1. Check for submit button
        submit_btn = form.find(lambda tag: (tag.name == "button" and tag.get("type") == "submit") or
                                           (tag.name == "input" and tag.get("type") == "submit"))
        
        if not submit_btn:
            findings.append({
                "issue_code": "FORM_MISSING_SUBMIT",
                "category": "forms",
                "severity": "CRITICAL",
                "title": f"Form '{form_id}' Missing Submit Button",
                "description": f"A form was detected on the page but it does not contain a standard submit button.",
                "business_impact": "Users will be unable to submit this form, resulting in complete failure of user conversions, sign-ups, or contact submissions.",
                "developer_fix": "Add a <button type='submit'>Submit</button> or <input type='submit' value='Submit' /> inside the form tag.",
                "confidence": "HIGH",
                "screenshot_reason": "Form missing submit button"
            })
            
        # 2. Check input fields validation
        inputs = form.find_all("input")
        has_email_field = False
        has_tel_field = False
        email_input_wrong_type = False
        tel_input_wrong_type = False
        missing_labels = []
        
        for inp in inputs:
            inp_type = inp.get("type", "text").lower()
            name = inp.get("name", "").lower()
            inp_id = inp.get("id", "")
            
            # Check for email inputs
            if "email" in name or "email" in inp_id:
                has_email_field = True
                if inp_type != "email":
                    email_input_wrong_type = True
                    
            # Check for phone inputs
            if any(term in name or term in inp_id for term in ["phone", "tel", "mobile", "contact"]):
                has_tel_field = True
                if inp_type != "tel":
                    tel_input_wrong_type = True
                    
            # Check for labels (Accessibility & Input Validation)
            if inp_type not in ("submit", "hidden", "button", "image"):
                # A label should exist with 'for' attribute matching input ID
                label = None
                if inp_id:
                    label = soup.find("label", attrs={"for": inp_id})
                if not label:
                    # Check if parent is a label
                    parent = inp.parent
                    if parent and parent.name == "label":
                        label = parent
                if not label:
                    missing_labels.append(inp.get("name") or inp_id or "unnamed input")
                    
        if email_input_wrong_type:
            findings.append({
                "issue_code": "FORM_EMAIL_INPUT_TYPE",
                "category": "forms",
                "severity": "MEDIUM",
                "title": f"Incorrect Input Type for Email Field in Form '{form_id}'",
                "description": "An email input field uses type='text' instead of type='email'.",
                "business_impact": "Using generic text inputs disables native mobile keyboard layouts and automatic email format validation.",
                "developer_fix": "Change the input type attribute to type='email'.",
                "confidence": "HIGH",
                "screenshot_reason": "Email field wrong input type"
            })
            
        if tel_input_wrong_type:
            findings.append({
                "issue_code": "FORM_TEL_INPUT_TYPE",
                "category": "forms",
                "severity": "LOW",
                "title": f"Incorrect Input Type for Phone Field in Form '{form_id}'",
                "description": "A phone/contact input field uses type='text' instead of type='tel'.",
                "business_impact": "Generic text types do not trigger numerical keypads on mobile screens, creating user friction.",
                "developer_fix": "Change the input type attribute to type='tel'.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })
            
        if missing_labels:
            findings.append({
                "issue_code": "FORM_INPUT_MISSING_LABELS",
                "category": "forms",
                "severity": "MEDIUM",
                "title": f"Form Fields Missing Labels in Form '{form_id}'",
                "description": f"The following inputs do not have associated <label> tags: {', '.join(missing_labels)}.",
                "business_impact": "Inputs without labels degrade accessibility, making forms difficult or impossible to fill out using screen readers.",
                "developer_fix": "Provide a <label for='[input-id]'> tag for each input, or wrap inputs inside <label> tags.",
                "confidence": "HIGH",
                "screenshot_reason": "Form input missing label"
            })

        # 3. Check textareas for maxlength attribute
        textareas = form.find_all("textarea")
        textareas_missing_maxlength = []
        for ta in textareas:
            if not ta.get("maxlength"):
                textareas_missing_maxlength.append(ta.get("name") or ta.get("id") or "unnamed textarea")
        
        if textareas_missing_maxlength:
            findings.append({
                "issue_code": "FORM_TEXTAREA_MISSING_MAXLENGTH",
                "category": "forms",
                "severity": "LOW",
                "title": f"Textarea Fields Missing Max Length Limit in Form '{form_id}'",
                "description": f"The following textareas do not restrict input length using a 'maxlength' attribute: {', '.join(textareas_missing_maxlength)}.",
                "business_impact": "Without length limits, malicious users can copy-paste massive blocks of text, potentially causing backend database storage bloat, crashes, or buffer overflows.",
                "developer_fix": "Add a 'maxlength' attribute to each textarea to set a reasonable upper bound (e.g. maxlength='1000').",
                "confidence": "HIGH",
                "screenshot_reason": None
            })

        # 4. Check for spam/bot protection (CAPTCHA or CSRF token)
        captcha_indicators = ["captcha", "recaptcha", "h-captcha", "turnstile", "g-recaptcha"]
        has_captcha = any(
            any(term in (el.get("id") or "").lower() or 
                term in (el.get("name") or "").lower() or 
                any(term in cls.lower() for cls in el.get("class", []))
                for term in captcha_indicators)
            for el in form.find_all(True)
        )
        
        has_csrf = False
        hidden_inputs = form.find_all("input", type="hidden")
        for hi in hidden_inputs:
            name_val = (hi.get("name") or "").lower()
            id_val = (hi.get("id") or "").lower()
            if "csrf" in name_val or "csrf" in id_val or "token" in name_val or "token" in id_val:
                has_csrf = True
                break
                
        if not (has_captcha or has_csrf):
            findings.append({
                "issue_code": "FORM_MISSING_SPAM_PROTECTION",
                "category": "forms",
                "severity": "MEDIUM",
                "title": f"Form '{form_id}' Lacks Spam or Bot Protection",
                "description": "The form does not appear to contain a CSRF token or any CAPTCHA/bot-prevention mechanism (reCAPTCHA, hCaptcha, Turnstile).",
                "business_impact": "Unprotected forms are highly susceptible to automated spam submissions, credential stuffing, and bot scraping attacks, causing high database noise and server load.",
                "developer_fix": "Implement a CSRF protection token middleware (like standard framework tokens) or integrate a modern captcha service (e.g. Cloudflare Turnstile or Google reCAPTCHA).",
                "confidence": "MEDIUM",
                "screenshot_reason": None
            })

        # 5. Check for insecure form submission action
        action_url = form.get("action", "").strip()
        if action_url.lower().startswith("http://"):
            findings.append({
                "issue_code": "FORM_INSECURE_ACTION",
                "category": "forms",
                "severity": "CRITICAL",
                "title": f"Insecure Action URL for Form '{form_id}'",
                "description": f"The form submits to an insecure HTTP URL: '{action_url}'.",
                "business_impact": "Form input data (including passwords or personal details) will be transmitted in plain text, making it vulnerable to interception by attackers on the network.",
                "developer_fix": "Ensure the form 'action' attribute points to an HTTPS URL, or use a relative path if the site is already served over HTTPS.",
                "confidence": "HIGH",
                "screenshot_reason": None
            })

    return findings
