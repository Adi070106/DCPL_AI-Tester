import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from app.database import get_db
from app.models import Report, AuditJob, Audit, User
from app.utils.auth import get_current_user
from app.config import BASE_DIR

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/download/{report_id}")
def download_report(
    report_id: int,
    report_title: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report record not found."
        )
        
    # Verify report audit exists
    audit = db.query(Audit).filter(Audit.id == report.audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit results not found."
        )
        
    # Fetch findings for the audit from database
    findings_list = []
    for f in audit.findings:
        findings_list.append({
            "id": f.id,
            "issue_code": f.issue_code,
            "category": f.category,
            "page_url": f.page_url,
            "severity": f.severity,
            "title": f.title,
            "description": f.description,
            "business_impact": f.business_impact,
            "developer_fix": f.developer_fix,
            "source": f.source,
            "confidence": f.confidence,
            "screenshot_id": f.screenshot_id
        })
        
    # Regenerate the PDF on-the-fly to apply branding settings and template upgrades
    from app.engine.report_gen import generate_client_report_pdf, generate_developer_report_pdf
    filename = Path(report.file_path).name
    
    try:
        if report.report_type == "CLIENT":
            generate_client_report_pdf(audit, findings_list, filename, report_title)
        else:
            generate_developer_report_pdf(audit, findings_list, filename, report_title)
    except Exception as ex:
        # Fallback to existing file if regeneration fails
        pass
        
    file_path = BASE_DIR / report.file_path
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report PDF file not found on disk. Checked: {file_path}"
        )
        
    # Set download headers
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/pdf"
    )
