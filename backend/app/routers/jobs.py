from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

from app.database import get_db
from app.models import User, AuditJob
from app.schemas import AuditJobCreate, AuditJobOut
from app.utils.auth import get_current_user
from app.engine.runner import execute_audit

router = APIRouter(prefix="/api/jobs", tags=["Audit Jobs"])

@router.post("", response_model=AuditJobOut, status_code=status.HTTP_201_CREATED)
def create_audit_job(
    job_in: AuditJobCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    url = job_in.website_url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL. Please enter a valid address starting with http:// or https://"
        )
        
    # Create database record
    new_job = AuditJob(
        user_id=current_user.id,
        website_url=url,
        status="PENDING",
        progress_percentage=0,
        selected_categories=job_in.selected_categories,
        schedule=job_in.schedule or "manual",
        assigned_to=job_in.assigned_to
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    # Run audit asynchronously in background thread
    background_tasks.add_task(execute_audit, new_job.id)
    
    return new_job

@router.get("/trends", response_model=List[dict])
def get_audit_trends(
    url: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    url = url.strip()
    clean_search_url = url
    if clean_search_url.endswith("/"):
        clean_search_url = clean_search_url[:-1]
        
    all_jobs = db.query(AuditJob).filter(
        AuditJob.status == "COMPLETED"
    ).order_by(AuditJob.created_at.asc()).all()
    
    trends = []
    for job in all_jobs:
        job_url = job.website_url.strip()
        if job_url.endswith("/"):
            job_url = job_url[:-1]
            
        if job_url == clean_search_url or clean_search_url in job_url:
            if job.audit:
                trends.append({
                    "job_id": job.id,
                    "date": ((job.completed_at or job.created_at) + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M IST"),
                    "overall_score": job.audit.overall_health_score,
                    "seo": job.audit.seo_score,
                    "performance": job.audit.performance_score,
                    "accessibility": job.audit.accessibility_score,
                    "responsiveness": job.audit.responsiveness_score,
                    "forms": job.audit.forms_score,
                    "navigation": job.audit.navigation_score,
                    "security": job.audit.security_score,
                    "content": job.audit.content_score,
                    "branding": job.audit.branding_score,
                })
    return trends

@router.get("", response_model=List[AuditJobOut])
def list_audit_jobs(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Retrieve jobs in descending order (newest first)
    jobs = db.query(AuditJob).order_by(AuditJob.created_at.desc()).all()
    return jobs

@router.get("/{job_id}", response_model=AuditJobOut)
def get_audit_job(
    job_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    job = db.query(AuditJob).filter(AuditJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit job not found."
        )
    return job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_audit_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import os
    job = db.query(AuditJob).filter(AuditJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit job not found."
        )
        
    if job.status in ["PENDING", "RUNNING"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an active audit job that is pending or running."
        )
        
    # Delete associated screenshot and PDF report files from filesystem
    if job.audit:
        for screenshot in job.audit.screenshots:
            if screenshot.file_path:
                full_path = os.path.join(os.getcwd(), screenshot.file_path)
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                    except Exception as e:
                        print(f"Error removing screenshot file {full_path}: {e}")
                        
        for report in job.audit.reports:
            if report.file_path:
                full_path = os.path.join(os.getcwd(), report.file_path)
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                    except Exception as e:
                        print(f"Error removing report file {full_path}: {e}")
                        
    db.delete(job)
    db.commit()
    return

@router.post("/complete", response_model=List[AuditJobOut])
def toggle_project_complete(
    website_url: str,
    completed: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    url = website_url.strip()
    jobs = db.query(AuditJob).filter(
        AuditJob.website_url == url
    ).all()
    
    if not jobs:
        clean_url = url[:-1] if url.endswith("/") else url
        all_jobs = db.query(AuditJob).all()
        jobs = []
        for job in all_jobs:
            j_url = job.website_url.strip()
            j_url_clean = j_url[:-1] if j_url.endswith("/") else j_url
            if j_url_clean == clean_url:
                jobs.append(job)

    if not jobs:
        raise HTTPException(
            status_code=404,
            detail="No jobs found for this target website."
        )
        
    for job in jobs:
        job.is_project_complete = completed
        
    db.commit()
    return jobs


@router.post("/assign", response_model=List[AuditJobOut])
def assign_project_developer(
    website_url: str,
    assigned_to: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    url = website_url.strip()
    jobs = db.query(AuditJob).filter(
        AuditJob.website_url == url
    ).all()
    
    if not jobs:
        clean_url = url[:-1] if url.endswith("/") else url
        all_jobs = db.query(AuditJob).all()
        jobs = []
        for job in all_jobs:
            j_url = job.website_url.strip()
            j_url_clean = j_url[:-1] if j_url.endswith("/") else j_url
            if j_url_clean == clean_url:
                jobs.append(job)

    if not jobs:
        raise HTTPException(
            status_code=404,
            detail="No jobs found for this target website."
        )
        
    for job in jobs:
        job.assigned_to = assigned_to
        
    db.commit()
    return jobs



