from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    custom_brand_name = Column(String, default="DCPL AI-Tester", nullable=False)
    brand_rules_str = Column("brand_rules", Text, nullable=True)
    role = Column(String, default="tester", nullable=False, server_default="tester")  # "tester" or "developer"

    # Relationships
    jobs = relationship("AuditJob", back_populates="user")

class AuditJob(Base):
    __tablename__ = "audit_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    website_url = Column(String, nullable=False)
    status = Column(String, default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    progress_percentage = Column(Integer, default=0)
    selected_categories_str = Column("selected_categories", String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    schedule = Column(String, default="manual", nullable=False)  # manual, daily, weekly
    last_scheduled_run = Column(DateTime, nullable=True)
    is_project_complete = Column(Boolean, default=False, nullable=False, server_default="0")
    assigned_to = Column(String, nullable=True)

    @property
    def selected_categories(self):
        if self.selected_categories_str:
            return self.selected_categories_str.split(",")
        return None

    @selected_categories.setter
    def selected_categories(self, value):
        if value:
            self.selected_categories_str = ",".join(value)
        else:
            self.selected_categories_str = None

    @property
    def overall_health_score(self):
        if self.audit:
            return self.audit.overall_health_score
        return None

    # Relationships
    user = relationship("User", back_populates="jobs")
    audit = relationship("Audit", back_populates="job", uselist=False, cascade="all, delete-orphan")

class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    audit_job_id = Column(Integer, ForeignKey("audit_jobs.id"), nullable=False)
    overall_health_score = Column(Integer, default=0)
    
    # Category Scores
    seo_score = Column(Integer, default=0)
    performance_score = Column(Integer, default=0)
    accessibility_score = Column(Integer, default=0)
    responsiveness_score = Column(Integer, default=0)
    forms_score = Column(Integer, default=0)
    navigation_score = Column(Integer, default=0)
    security_score = Column(Integer, default=0)
    content_score = Column(Integer, default=0)
    branding_score = Column(Integer, default=0)
    footer_score = Column(Integer, default=0)

    total_pages_scanned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    crawl_relations_str = Column("crawl_relations", Text, nullable=True)
    slowest_pages_str = Column("slowest_pages", Text, nullable=True)
    heavy_assets_str = Column("heavy_assets", Text, nullable=True)
    broken_links_str = Column("broken_links", Text, nullable=True)
    page_seo_str = Column("page_seo", Text, nullable=True)
    security_details_str = Column("security_details", Text, nullable=True)

    # Relationships
    job = relationship("AuditJob", back_populates="audit")
    findings = relationship("Finding", back_populates="audit", cascade="all, delete-orphan")
    screenshots = relationship("Screenshot", back_populates="audit", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="audit", cascade="all, delete-orphan")

class Screenshot(Base):
    __tablename__ = "screenshots"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    page_url = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    audit = relationship("Audit", back_populates="screenshots")
    findings = relationship("Finding", back_populates="screenshot")

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    issue_code = Column(String, nullable=False)
    category = Column(String, nullable=False)
    page_url = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    business_impact = Column(Text, nullable=True)
    developer_fix = Column(Text, nullable=True)
    source = Column(String, nullable=False)  # playwright, lighthouse, axe, beautifulsoup, custom
    confidence = Column(String, nullable=False)  # HIGH, MEDIUM, LOW
    screenshot_id = Column(Integer, ForeignKey("screenshots.id"), nullable=True)
    is_fixed = Column(Boolean, default=False, nullable=False)
    element_coords = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    audit = relationship("Audit", back_populates="findings")
    screenshot = relationship("Screenshot", back_populates="findings")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    report_type = Column(String, nullable=False)  # CLIENT, DEVELOPER
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    audit = relationship("Audit", back_populates="reports")
