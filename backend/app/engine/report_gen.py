import logging
import html
from pathlib import Path
from datetime import timedelta
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.config import REPORT_DIR, BASE_DIR

logger = logging.getLogger(__name__)

def generate_client_report_pdf(audit, findings, filename: str, report_title: str = None) -> str:
    """Generate client-friendly PDF report focusing on business impact and high-level scores."""
    pdf_path = REPORT_DIR / filename
    doc = SimpleDocTemplate(str(pdf_path), pagesize=letter,
                            rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#1A365D"),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#4A5568"),
        spaceAfter=40
    )
    
    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1A365D"),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#2D3748"),
        spaceAfter=8
    )
    
    bold_body_style = ParagraphStyle(
        'BoldBodyCustom',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    from urllib.parse import urlparse
    domain = urlparse(audit.job.website_url).netloc.replace("www.", "")
    
    story = []
    
    # --- COVER PAGE ---
    story.append(Spacer(1, 100))
    story.append(Paragraph("WEBSITE AUDIT REPORT", title_style))
    story.append(Paragraph(f"Client-Friendly QA Assessment for {domain}", subtitle_style))
    
    # Metadata Table
    meta_data = []
    if report_title:
        meta_data.append([Paragraph("<b>Project Name:</b>", body_style), Paragraph(report_title, body_style)])
    meta_data.extend([
        [Paragraph("<b>Website Name:</b>", body_style), Paragraph(domain, body_style)],
        [Paragraph("<b>Website URL:</b>", body_style), Paragraph(audit.job.website_url, body_style)],
        [Paragraph("<b>Overall Health Score:</b>", body_style), Paragraph(f"<b>{audit.overall_health_score}/100</b>", bold_body_style)],
        [Paragraph("<b>Pages Scanned:</b>", body_style), Paragraph(str(audit.total_pages_scanned), body_style)],
        [Paragraph("<b>Date Generated:</b>", body_style), Paragraph((audit.created_at + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M:%S IST"), body_style)],
        [Paragraph("<b>Audited By:</b>", body_style), Paragraph(f"{audit.job.user.custom_brand_name} Quality Audit SaaS", body_style)],
    ])
    t_meta = Table(meta_data, colWidths=[150, 350])
    t_meta.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
    ]))
    story.append(t_meta)
    
    story.append(PageBreak())
    
    # --- EXECUTIVE SUMMARY ---
    story.append(Paragraph("Executive Summary", h1_style))
    summary_text = (
        "This quality assurance report was compiled automatically using advanced crawlers and automated auditing rules. "
        "The assessment covers crucial vectors including SEO, Performance, Accessibility, Responsiveness, Security, Forms, and Branding consistency. "
        "Below is the breakdown of scores for each audited dimension."
    )
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 15))
    
    # Scores Table
    score_data = [
        [Paragraph("<b>Audit Category</b>", bold_body_style), Paragraph("<b>Score</b>", bold_body_style)],
        [Paragraph("Search Engine Optimization (SEO)", body_style), Paragraph(f"{audit.seo_score}/100" if audit.seo_score >= 0 else "N/A", body_style)],
        [Paragraph("Performance & Loading Speed", body_style), Paragraph(f"{audit.performance_score}/100" if audit.performance_score >= 0 else "N/A", body_style)],
        [Paragraph("Accessibility (WCAG Compliance)", body_style), Paragraph(f"{audit.accessibility_score}/100" if audit.accessibility_score >= 0 else "N/A", body_style)],
        [Paragraph("Responsiveness & Mobile Friendliness", body_style), Paragraph(f"{audit.responsiveness_score}/100" if audit.responsiveness_score >= 0 else "N/A", body_style)],
        [Paragraph("Interactive Forms & Inputs", body_style), Paragraph(f"{audit.forms_score}/100" if audit.forms_score >= 0 else "N/A", body_style)],
        [Paragraph("Navigation & Links", body_style), Paragraph(f"{audit.navigation_score}/100" if audit.navigation_score >= 0 else "N/A", body_style)],
        [Paragraph("Security Headers & Encryptions", body_style), Paragraph(f"{audit.security_score}/100" if audit.security_score >= 0 else "N/A", body_style)],
        [Paragraph("Content Quality & Copywriting", body_style), Paragraph(f"{audit.content_score}/100" if audit.content_score >= 0 else "N/A", body_style)],
        [Paragraph("Branding & Consistency", body_style), Paragraph(f"{audit.branding_score}/100" if audit.branding_score >= 0 else "N/A", body_style)],
        [Paragraph("Footer Compliance & Attributions", body_style), Paragraph(f"{audit.footer_score}/100" if audit.footer_score >= 0 else "N/A", body_style)],
    ]
    t_scores = Table(score_data, colWidths=[350, 150])
    t_scores.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F7FAFC")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TEXTCOLOR', (1,1), (1,-1), colors.HexColor("#2B6CB0")),
    ]))
    story.append(t_scores)
    story.append(Spacer(1, 20))
    
    # --- KEY ISSUES ---
    story.append(Paragraph("Key Issues Detected", h1_style))
    story.append(Paragraph("The following critical and high-priority issues require immediate attention to improve the user experience and conversions:", body_style))
    story.append(Spacer(1, 10))
    
    critical_high_findings = [f for f in findings if f.get("severity") in ("CRITICAL", "HIGH")]
    
    if not critical_high_findings:
        story.append(Paragraph("Excellent! No critical or high-severity issues were detected on the website.", body_style))
    else:
        # Create table of key findings
        finding_data = [
            [Paragraph("<b>Category</b>", bold_body_style), Paragraph("<b>Issue</b>", bold_body_style), Paragraph("<b>Business Impact</b>", bold_body_style)]
        ]
        for f in critical_high_findings[:10]:  # limit to top 10 for length
            title = html.escape(f.get('title', ''))
            description = html.escape(f.get('description', ''))
            business_impact = html.escape(f.get('business_impact', 'N/A'))
            category = html.escape(f.get('category', 'General').capitalize())
            
            finding_data.append([
                Paragraph(category, body_style),
                Paragraph(f"<b>{title}</b><br/>{description}", body_style),
                Paragraph(business_impact, body_style)
            ])
            
        t_findings = Table(finding_data, colWidths=[80, 220, 200])
        t_findings.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F7FAFC")),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ]))
        story.append(t_findings)
        
    doc.build(story)
    return f"storage/reports/{filename}"

def generate_developer_report_pdf(audit, findings, filename: str, report_title: str = None) -> str:
    """Generate developer PDF report focusing on technical details, codes, URLs, and solutions."""
    pdf_path = REPORT_DIR / filename
    doc = SimpleDocTemplate(str(pdf_path), pagesize=letter,
                            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DevCoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#2C5282"),
        spaceAfter=10
    )
    
    h1_style = ParagraphStyle(
        'DevHeader1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#2C5282"),
        spaceBefore=15,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DevBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1A202C")
    )
    
    code_style = ParagraphStyle(
        'DevCode',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#805AD5"),
        spaceBefore=4,
        spaceAfter=4
    )
    
    bold_style = ParagraphStyle(
        'DevBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    from urllib.parse import urlparse
    domain = urlparse(audit.job.website_url).netloc.replace("www.", "")
    
    story = []
    
    # Title Section
    story.append(Paragraph(f"DEVELOPER TECHNICAL AUDIT REPORT", title_style))
    proj_desc = f" | Project: <b>{report_title}</b>" if report_title else ""
    story.append(Paragraph(f"Website Name: <b>{domain}</b>{proj_desc} | Target Site: {audit.job.website_url} | Scanned Pages: {audit.total_pages_scanned}", body_style))
    story.append(Spacer(1, 15))
    
    # Findings Details
    story.append(Paragraph("Detailed Technical Findings", h1_style))
    story.append(Spacer(1, 10))
    
    # Sort findings by severity (Critical, High, Medium, Low)
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    sorted_findings = sorted(findings, key=lambda x: severity_order.get(x.get("severity", "LOW"), 4))
    
    for idx, f in enumerate(sorted_findings):
        # Color coding for severity
        sev = f.get("severity", "LOW")
        sev_color = "#E53E3E" if sev == "CRITICAL" else "#DD6B20" if sev == "HIGH" else "#D69E2E" if sev == "MEDIUM" else "#3182CE"
        
        # Finding Details Table
        title = html.escape(f.get('title', ''))
        issue_code = html.escape(f.get('issue_code', ''))
        source = html.escape(f.get('source', 'custom'))
        page_url = html.escape(f.get('page_url', ''))
        confidence = html.escape(f.get('confidence', 'HIGH'))
        description = html.escape(f.get('description', ''))
        developer_fix = html.escape(f.get('developer_fix', 'N/A'))

        f_details = [
            [
                Paragraph(f"<b>[{sev}] {title}</b>", ParagraphStyle('SevTitle', parent=bold_style, textColor=colors.HexColor(sev_color))),
                Paragraph(f"Code: <code>{issue_code}</code> | Source: {source}", body_style)
            ],
            [
                Paragraph(f"<b>URL:</b> {page_url}", body_style),
                Paragraph(f"<b>Confidence:</b> {confidence}", body_style)
            ],
            [
                Paragraph(f"<b>Description:</b> {description}", body_style),
                Paragraph("", body_style)
            ],
            [
                Paragraph(f"<b>Developer Fix:</b>", bold_style),
                Paragraph(developer_fix, code_style)
            ]
        ]
        
        t_finding = Table(f_details, colWidths=[270, 260])
        t_finding.setStyle(TableStyle([
            ('SPAN', (0, 2), (1, 2)), # span description across columns
            ('SPAN', (1, 3), (1, 3)), # empty space
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('LINELEFT', (0,0), (0,-1), 3, colors.HexColor(sev_color)),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ]))
        
        story.append(t_finding)
        story.append(Spacer(1, 10))
        
        # Embed screenshot if present and file exists
        screenshot_id = f.get("screenshot_id")
        if screenshot_id:
            # We can lookup path from database if needed, but since we are generating
            # in-process, we can just look up screenshots if we have them.
            # In runner, we saved the screenshot in SQLite. Let's see if we can find the screenshot's filename:
            # Let's check how runner.py saves screenshots: "storage/screenshots/screenshot_..."
            # Let's search if we can construct the path.
            # Yes! The screenshot file path is inside BASE_DIR / screenshot_record.file_path
            # Let's see if we can read the file path. But wait! Since we are generating the report *during* the execution,
            # we can look it up in DB, or look up by screenshot_id.
            # Let's look up the screenshot record in DB inside this report generator:
            from app.database import SessionLocal
            from app.models import Screenshot as ScreenshotModel
            db = SessionLocal()
            ss_rec = db.query(ScreenshotModel).filter(ScreenshotModel.id == screenshot_id).first()
            if ss_rec:
                full_ss_path = BASE_DIR / ss_rec.file_path
                if full_ss_path.exists():
                    try:
                        # Load and scale image to fit page width (max width ~500)
                        img = Image(str(full_ss_path), width=450, height=270)
                        story.append(Paragraph("<b>Captured Screenshot:</b>", bold_style))
                        story.append(Spacer(1, 4))
                        story.append(img)
                        story.append(Spacer(1, 10))
                    except Exception as img_ex:
                        logger.error(f"Failed to render screenshot image in PDF: {img_ex}")
            db.close()
            
    doc.build(story)
    return f"storage/reports/{filename}"
