from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Audit, AuditJob, Finding
from app.schemas import AuditDetailOut, AuditOut, FindingOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/audits", tags=["Audits"])

@router.get("/by-job/{job_id}", response_model=AuditDetailOut)
def get_audit_by_job(
    job_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    job = db.query(AuditJob).filter(AuditJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
        
    audit = db.query(Audit).filter(Audit.audit_job_id == job_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit results not ready yet."
        )
        
    return audit

@router.get("/{audit_id}", response_model=AuditDetailOut)
def get_audit(
    audit_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit results not found."
        )
        
    return audit

@router.put("/findings/{finding_id}/toggle-fixed", response_model=FindingOut)
def toggle_finding_fixed(
    finding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found."
        )
        
    finding.is_fixed = not finding.is_fixed
    db.commit()
    db.refresh(finding)
    return finding

@router.get("/compare/run")
def compare_audits(
    audit_id_a: int,
    audit_id_b: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    audit_a = db.query(Audit).filter(Audit.id == audit_id_a).first()
    audit_b = db.query(Audit).filter(Audit.id == audit_id_b).first()
    
    if not audit_a or not audit_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both audits not found."
        )
        
    categories = ["seo", "performance", "accessibility", "responsiveness", "forms", "navigation", "security", "content", "branding", "footer"]
    score_comparison = {}
    for cat in categories:
        score_a = getattr(audit_a, f"{cat}_score")
        score_b = getattr(audit_b, f"{cat}_score")
        score_comparison[cat] = {
            "a": score_a,
            "b": score_b,
            "delta": score_b - score_a if score_a >= 0 and score_b >= 0 else 0
        }
    
    score_comparison["overall"] = {
        "a": audit_a.overall_health_score,
        "b": audit_b.overall_health_score,
        "delta": audit_b.overall_health_score - audit_a.overall_health_score
    }
    
    # Compare findings
    # Find active (unfixed) findings for both
    findings_a = [f for f in audit_a.findings if not f.is_fixed]
    findings_b = [f for f in audit_b.findings if not f.is_fixed]
    
    set_a = {(f.issue_code, f.page_url) for f in findings_a}
    set_b = {(f.issue_code, f.page_url) for f in findings_b}
    
    resolved_keys = set_a - set_b
    new_keys = set_b - set_a
    persistent_keys = set_a & set_b
    
    resolved = []
    seen_resolved = set()
    for f in findings_a:
        key = (f.issue_code, f.page_url)
        if key in resolved_keys and key not in seen_resolved:
            seen_resolved.add(key)
            resolved.append({
                "title": f.title,
                "category": f.category,
                "severity": f.severity,
                "page_url": f.page_url
            })
            
    new = []
    seen_new = set()
    for f in findings_b:
        key = (f.issue_code, f.page_url)
        if key in new_keys and key not in seen_new:
            seen_new.add(key)
            new.append({
                "title": f.title,
                "category": f.category,
                "severity": f.severity,
                "page_url": f.page_url
            })
            
    persistent = []
    seen_persistent = set()
    for f in findings_b:
        key = (f.issue_code, f.page_url)
        if key in persistent_keys and key not in seen_persistent:
            seen_persistent.add(key)
            persistent.append({
                "title": f.title,
                "category": f.category,
                "severity": f.severity,
                "page_url": f.page_url
            })
            
    return {
        "audit_a": {
            "id": audit_a.id,
            "website_url": audit_a.job.website_url,
            "created_at": audit_a.created_at
        },
        "audit_b": {
            "id": audit_b.id,
            "website_url": audit_b.job.website_url,
            "created_at": audit_b.created_at
        },
        "scores": score_comparison,
        "findings": {
            "resolved": resolved,
            "new": new,
            "persistent": persistent
        }
    }

@router.get("/{audit_id}/history")
def get_audit_history(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found."
        )
        
    website_url = audit.job.website_url
    
    past_audits = (
        db.query(Audit)
        .join(AuditJob)
        .filter(
            AuditJob.website_url == website_url,
            AuditJob.status == "COMPLETED"
        )
        .order_by(Audit.created_at.asc())
        .all()
    )
    
    from datetime import timedelta
    history_data = []
    for a in past_audits:
        history_data.append({
            "id": a.id,
            "created_at": a.created_at,
            "date": (a.created_at + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M IST"),
            "overall": a.overall_health_score,
            "seo": a.seo_score,
            "performance": a.performance_score,
            "accessibility": a.accessibility_score,
            "responsiveness": a.responsiveness_score,
            "forms": a.forms_score,
            "navigation": a.navigation_score,
            "security": a.security_score,
            "content": a.content_score,
            "branding": a.branding_score,
            "footer": a.footer_score,
            "total_pages": a.total_pages_scanned
        })
        
    return history_data

