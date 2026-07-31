import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            super().showPage()
        super().save()

    def draw_page_elements(self, page_count):
        self.saveState()
        
        # We do not draw headers/footers on the cover page
        if self._pageNumber == 1:
            # Draw decorative border on cover page
            self.setStrokeColor(colors.HexColor("#4f46e5")) # brand indigo
            self.setLineWidth(4)
            self.line(30, 30, 30, 762)
            self.line(30, 762, 582, 762)
            self.line(582, 762, 582, 30)
            self.line(582, 30, 30, 30)
            self.restoreState()
            return

        # Running Header
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1e1b4b")) # deep brand blue
        self.drawString(54, 745, "DCPL AI-TESTER")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b")) # slate-500
        self.drawRightString(558, 745, "PROJECT HANDOVER GUIDE")
        
        # Thin header line
        self.setStrokeColor(colors.HexColor("#cbd5e1")) # slate-300
        self.setLineWidth(0.5)
        self.line(54, 737, 558, 737)
        
        # Running Footer
        self.line(54, 52, 558, 52)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 40, "Confidential — Dimakh Consultants")
        self.drawRightString(558, 40, f"Page {self._pageNumber} of {page_count}")
        
        self.restoreState()

def generate_pdf():
    pdf_path = "DCPL_AI-Tester_Handover_Guide.pdf"
    
    # 54 points = 0.75 in margin. Top/Bottom margins set to 72 points (1.0 in) to clear headers/footers
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )
    
    styles = getSampleStyleSheet()
    
    # Base modifications & custom styles
    # Primary: #4f46e5 (Indigo), Dark Text: #0f172a, Muted Text: #475569
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155")
    )
    
    code_style = ParagraphStyle(
        'CustomCode',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=6
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    title_style = ParagraphStyle(
        'CoverTitle',
        fontName='Helvetica-Bold',
        fontSize=32,
        leading=38,
        textColor=colors.HexColor("#1e1b4b"),
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        fontName='Helvetica',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#4f46e5"),
        spaceAfter=30
    )
    
    meta_style = ParagraphStyle(
        'CoverMeta',
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#475569")
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e1b4b"),
        spaceBefore=18,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#4f46e5"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'CustomH3',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=body_style,
        fontSize=9,
        leading=12
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
        textColor=colors.white
    )

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 100))
    story.append(Paragraph("DCPL AI-Tester", title_style))
    story.append(Paragraph("Project Handover & Modernization Guide", subtitle_style))
    story.append(Spacer(1, 40))
    
    # Simple accent bar
    story.append(Table(
        [[Paragraph("", body_style)]],
        colWidths=[100],
        rowHeights=[4],
        style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#4f46e5")),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ])
    ))
    story.append(Spacer(1, 150))
    
    story.append(Paragraph("<b>Version:</b> 1.1<br/>"
                           "<b>Date:</b> July 31, 2026<br/>"
                           "<b>Prepared For:</b> IT / Engineering Team, Dimakh Consultants<br/>"
                           "<b>Prepared By:</b> Advanced Agentic Coding Team", meta_style))
    story.append(PageBreak())

    # ==================== SECTION 1 ====================
    story.append(Paragraph("1. Executive Summary", h1_style))
    story.append(Paragraph(
        "The <b>DCPL AI-Tester</b> is a high-performance web auditing and crawler application developed for Dimakh Consultants. "
        "It provides automated checks across ten critical dimensions: SEO, Performance, Accessibility, Responsiveness, Forms, Navigation, Security, Content, Branding, and Footer metrics. "
        "The application utilizes <b>Playwright</b> for robust headless browser actions and audits, paired with a React/Next.js frontend and a FastAPI backend.",
        body_style
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "This guide covers the system architecture, code refactoring details, recent bug resolution history, and local development configurations to facilitate a smooth project handover.",
        body_style
    ))
    story.append(Spacer(1, 15))

    # ==================== SECTION 2 ====================
    story.append(Paragraph("2. System Architecture & Tech Stack", h1_style))
    story.append(Paragraph("The system is divided into two distinct services communicating over HTTP/REST:", body_style))
    
    story.append(Paragraph("&bull; <b>Frontend</b>: Next.js (version 16.2.7), React (version 19.2.4), Tailwind CSS, Recharts for dashboard data visualizations.", bullet_style))
    story.append(Paragraph("&bull; <b>Backend API</b>: FastAPI (Python), SQLAlchemy (ORM), SQLite (database), Uvicorn (ASGI web server).", bullet_style))
    story.append(Paragraph("&bull; <b>Auditing Engine</b>: Playwright Python API running headless Chrome instances to crawl websites, capture screenshots, and perform technical checks.", bullet_style))
    story.append(Paragraph("&bull; <b>PDF Generation</b>: ReportLab template generators for offline Client and Developer PDF report compilation.", bullet_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Git Repository Details:", h2_style))
    story.append(Paragraph(
        "<b>Repository URL:</b> https://github.com/Adi070106/DCPL_AI-Tester.git<br/>"
        "<b>Primary Branch:</b> main",
        body_style
    ))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Directory Structure Overview:", h2_style))
    story.append(Paragraph(
        "<b>c:/DCPL_AI-Tester/</b><br/>"
        "&nbsp;&nbsp;├── <b>backend/</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>FastAPI Application Root</i><br/>"
        "&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── app/<br/>"
        "&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── database.py&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>DB connections / sessions</i><br/>"
        "&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── models.py&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>SQLAlchemy Models</i><br/>"
        "&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── config.py&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Backend parameters &amp; CORS</i><br/>"
        "&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── engine/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Audit runner, crawler &amp; report PDF logic</i><br/>"
        "&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── routers/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>FastAPI routers (auth, jobs, audits, reports)</i><br/>"
        "&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── run.py&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Backend entrypoint script</i><br/>"
        "&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── app.db&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>SQLite database file</i><br/>"
        "&nbsp;&nbsp;└── <b>frontend/</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Next.js Application Root</i><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── src/app/<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── dashboard/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Tester dashboard page</i><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── developer/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Read-only developer dashboard</i><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── audits/[id]/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Audit detail, graphs &amp; PDF downloads</i><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── next.config.mjs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Next.js dev configuration</i><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── .env.local&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>Frontend environment file</i>",
        code_style
    ))
    story.append(PageBreak())

    # ==================== SECTION 3 ====================
    story.append(Paragraph("3. Summary of Recent Bug Fixes", h1_style))
    story.append(Paragraph("Four critical system and architectural bugs were resolved in the codebase during recent sprints:", body_style))
    story.append(Spacer(1, 10))
    
    # Bug 1
    story.append(Paragraph("A. Audit Run All-N/A Scoring Bug", h2_style))
    story.append(Paragraph(
        "<b>Issue:</b> When auditing multi-page sites (e.g. 74 pages), if any subpage failed to audit due to network timeout or crawler hiccups, it emitted a <code>TECH_PAGE_LOAD_FAILED</code> finding. "
        "The scoring logic incorrectly checked for *any* page failure in the run and zeroed out/flagged as N/A the entire website score profile, rendering the audit results useless.<br/>"
        "<b>Resolution:</b> Modified <code>calculate_health_scores</code> in <code>backend/app/engine/runner.py</code> to validate the failure of the <b>homepage seed URL only</b> (using normalized URL strings with trailing slashes stripped). Subpage timeout issues are logged as standalone issues without wiping out the entire report scores.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # Bug 2
    story.append(Paragraph("B. Crawl Map Visualization Overlap & Drift", h2_style))
    story.append(Paragraph(
        "<b>Issue:</b> The SVG-based Radial and Horizontal Crawl Maps were cluttered and overlapping due to two conflicting layout engines running in parallel (one in <code>useEffect</code>, one at render-time). In addition, an active physics relaxation loop was causing nodes to drift uncontrollably.<br/>"
        "<b>Resolution:</b> Removed the stale render-time layout computation in <code>frontend/src/app/audits/[id]/page.js</code>. Expanded the Radial map bounds to a <b>1400x1000</b> viewport with customizable ring spacings, and the Horizontal map to dynamically scale heights vertically at 36px per node. Disabled the physics ticks (<code>physicsTicks: 0</code>) to ensure layouts are stable and deterministic.",
        body_style
    ))
    story.append(PageBreak())

    # Bug 3
    story.append(KeepTogether([
        Paragraph("C. Cross-Origin (CORS) & Network Access Blocks", h2_style),
        Paragraph(
            "<b>Issue:</b> Testing the application over local Wi-Fi router networks failed because API endpoints were bound to local loopbacks, backend CORS policies rejected requests, and Next.js blocked hot-module reload dev server access.<br/>"
            "<b>Resolution:</b> Configured the frontend <code>.env.local</code> to target the host machine's loopback, updated the allowed CORS origin lists in <code>backend/app/config.py</code>, and declared appropriate development network hosts in <code>next.config.mjs</code> to permit local dev previews across network boundaries.",
            body_style
        )
    ]))
    story.append(Spacer(1, 10))

    # Bug 4
    story.append(KeepTogether([
        Paragraph("D. Comparison Trends Polling Loop Performance Fix", h2_style),
        Paragraph(
            "<b>Issue:</b> Moving to the 'Compare Runs' tab triggered an infinite loop of AJAX queries, firing dozens of API requests per second to the <code>/api/jobs/trends</code> endpoint due to state mutation in a React hook dependency array.<br/>"
            "<b>Resolution:</b> Implemented a <code>useRef</code> flag (<code>compareRunsFetchedRef</code>) to track request state cleanly, and removed the state variable from the dependency array in <code>page.js</code> to enforce a single execution per render context.",
            body_style
        )
    ]))
    story.append(Spacer(1, 15))

    # ==================== SECTION 4 ====================
    story.append(Paragraph("4. Developer Operations & Environment Commands", h1_style))
    story.append(Paragraph("To run the application locally in development mode, execute the following commands:", body_style))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("1. Start Backend Server:", h2_style))
    story.append(Paragraph(
        "cd c:/DCPL_AI-Tester/backend\n"
        "python run.py",
        code_style
    ))
    story.append(Paragraph("The API server starts locally at <b>http://127.0.0.1:8080</b>.", body_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("2. Start Frontend Server:", h2_style))
    story.append(Paragraph(
        "cd c:/DCPL_AI-Tester/frontend\n"
        "npm run dev -- -p 5173",
        code_style
    ))
    story.append(Paragraph("The frontend application builds and runs at **http://localhost:5173**.", body_style))
    story.append(Spacer(1, 15))

    # ==================== SECTION 5 ====================
    story.append(Paragraph("5. Default Project Credentials", h1_style))
    story.append(Paragraph("For testing, database tables have been seeded and verified with the following local logins:", body_style))
    story.append(Spacer(1, 8))
    
    # Credentials Table
    headers = [Paragraph("Role", table_header_style), Paragraph("Login Email", table_header_style), Paragraph("Password", table_header_style)]
    row_tester = [Paragraph("Tester (Read/Write)", table_cell_style), Paragraph("aditya.gunjal@dimakhconsultants.com", table_cell_style), Paragraph("password123", table_cell_style)]
    row_developer = [Paragraph("Developer (Read-Only)", table_cell_style), Paragraph("developer@dimakhconsultants.com", table_cell_style), Paragraph("password123", table_cell_style)]
    
    creds_table = Table([headers, row_tester, row_developer], colWidths=[120, 260, 120])
    creds_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e1b4b")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ('TOPPADDING', (0,1), (-1,-1), 6),
    ]))
    story.append(creds_table)
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("This concludes the project handover documentation.", body_style))

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print("Handover guide PDF generated successfully.")

if __name__ == "__main__":
    generate_pdf()
