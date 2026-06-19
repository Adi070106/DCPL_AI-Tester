from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, List
from datetime import datetime

# Auth / User schemas
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserSettingsUpdate(BaseModel):
    custom_brand_name: str
    brand_rules_str: Optional[str] = None

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_active: bool
    created_at: datetime
    custom_brand_name: str
    brand_rules_str: Optional[str] = None
    role: str = "tester"

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None

# Job schemas
class AuditJobCreate(BaseModel):
    website_url: str
    selected_categories: Optional[List[str]] = None
    schedule: Optional[str] = "manual"
    assigned_to: Optional[str] = None

class AuditJobOut(BaseModel):
    id: int
    user_id: int
    website_url: str
    status: str
    progress_percentage: int
    selected_categories: Optional[List[str]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    schedule: str
    last_scheduled_run: Optional[datetime] = None
    overall_health_score: Optional[int] = None
    is_project_complete: bool = False
    assigned_to: Optional[str] = None

    class Config:
        from_attributes = True

# Screenshot schemas
class ScreenshotOut(BaseModel):
    id: int
    audit_id: int
    page_url: str
    file_path: str
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Finding schemas
class FindingOut(BaseModel):
    id: int
    audit_id: int
    issue_code: str
    category: str
    page_url: str
    severity: str
    title: str
    description: str
    business_impact: Optional[str] = None
    developer_fix: Optional[str] = None
    source: str
    confidence: str
    screenshot_id: Optional[int] = None
    is_fixed: bool = False
    element_coords: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Report schemas
class ReportOut(BaseModel):
    id: int
    audit_id: int
    report_type: str
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True

# Audit Detail schemas
class AuditOut(BaseModel):
    id: int
    audit_job_id: int
    overall_health_score: int
    
    seo_score: int
    performance_score: int
    accessibility_score: int
    responsiveness_score: int
    forms_score: int
    navigation_score: int
    security_score: int
    content_score: int
    branding_score: int
    footer_score: int

    total_pages_scanned: int
    created_at: datetime
    crawl_relations_str: Optional[str] = None
    slowest_pages_str: Optional[str] = None
    heavy_assets_str: Optional[str] = None
    broken_links_str: Optional[str] = None
    page_seo_str: Optional[str] = None
    security_details_str: Optional[str] = None

    class Config:
        from_attributes = True

class AuditDetailOut(AuditOut):
    job: AuditJobOut
    findings: List[FindingOut] = []
    screenshots: List[ScreenshotOut] = []
    reports: List[ReportOut] = []

    class Config:
        from_attributes = True
