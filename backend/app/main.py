import logging
import threading
import time
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path

from app.database import engine, Base, SessionLocal
from app.routers import auth, jobs, audits, reports
from app.config import STORAGE_DIR, CORS_ORIGINS
from app.models import AuditJob
from app.engine.runner import execute_audit

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize DB Tables
logger.info("Initializing database tables...")
Base.metadata.create_all(bind=engine)

# --- DB Migration: Add 'role' column to users table if it doesn't exist ---
def migrate_and_seed():
    from sqlalchemy import inspect as sa_inspect, text
    from app.models import User
    from app.utils.auth import get_password_hash

    db = SessionLocal()
    try:
        inspector = sa_inspect(engine)
        columns = [col["name"] for col in inspector.get_columns("users")]
        if "role" not in columns:
            logger.info("Migrating DB: Adding 'role' column to users table...")
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'tester' NOT NULL"))
            logger.info("Migration complete: 'role' column added.")

        # Seed developer account
        dev_email = "developer@dimakhconsultants.com"
        existing = db.query(User).filter(User.email == dev_email).first()
        if not existing:
            logger.info(f"Seeding developer account: {dev_email}")
            dev_user = User(
                name="Developer",
                email=dev_email,
                password_hash=get_password_hash("password123"),
                role="developer"
            )
            db.add(dev_user)
            db.commit()
            logger.info("Developer account created successfully.")
        else:
            # Ensure existing dev account has role=developer
            if getattr(existing, 'role', 'tester') != 'developer':
                existing.role = 'developer'
                db.commit()
                logger.info("Updated existing developer account role.")
    except Exception as e:
        logger.error(f"Migration/seeding error: {e}", exc_info=True)
    finally:
        db.close()

migrate_and_seed()

def run_scheduler():
    logger.info("Background Active Monitor Scheduler thread started.")
    while True:
        try:
            db = SessionLocal()
            # Fetch all completed or failed jobs with schedule set to daily/weekly
            jobs = db.query(AuditJob).filter(
                AuditJob.schedule.in_(["daily", "weekly"]),
                AuditJob.status.in_(["COMPLETED", "FAILED"])
            ).all()
            
            # Find latest job per user & website_url combination
            latest_jobs = {}
            for job in jobs:
                key = (job.user_id, job.website_url)
                if key not in latest_jobs:
                    latest_jobs[key] = job
                else:
                    current_latest = latest_jobs[key]
                    current_time = current_latest.completed_at or current_latest.created_at
                    job_time = job.completed_at or job.created_at
                    if job_time and current_time and job_time > current_time:
                        latest_jobs[key] = job
            
            for key, latest_job in latest_jobs.items():
                # Check if there is an active (PENDING/RUNNING) job for this website
                active_job = db.query(AuditJob).filter(
                    AuditJob.user_id == latest_job.user_id,
                    AuditJob.website_url == latest_job.website_url,
                    AuditJob.status.in_(["PENDING", "RUNNING"])
                ).first()
                if active_job:
                    continue
                
                now = datetime.utcnow()
                last_run = latest_job.completed_at or latest_job.created_at
                if not last_run:
                    continue
                
                is_due = False
                if latest_job.schedule == "daily":
                    if now - last_run >= timedelta(days=1):
                        is_due = True
                elif latest_job.schedule == "weekly":
                    if now - last_run >= timedelta(days=7):
                        is_due = True
                
                if is_due:
                    logger.info(f"Scheduler: {latest_job.website_url} is due for scheduled audit ({latest_job.schedule}). Cloning job...")
                    # Create cloned job
                    new_job = AuditJob(
                        user_id=latest_job.user_id,
                        website_url=latest_job.website_url,
                        status="PENDING",
                        progress_percentage=0,
                        selected_categories_str=latest_job.selected_categories_str,
                        schedule=latest_job.schedule
                    )
                    db.add(new_job)
                    db.commit()
                    db.refresh(new_job)
                    
                    latest_job.last_scheduled_run = now
                    db.commit()
                    
                    # Start execute_audit in a daemon thread so it doesn't block the scheduler loop
                    thread = threading.Thread(target=execute_audit, args=(new_job.id,), daemon=True)
                    thread.start()
            db.close()
        except Exception as ex:
            logger.error(f"Error in background active monitor scheduler loop: {ex}", exc_info=True)
        time.sleep(60)

# Start scheduler thread
scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
scheduler_thread.start()


app = FastAPI(
    title="Website QA & Audit SaaS API",
    description="Automated audit and quality checks engine for Dimakh Consultants",
    version="1.0.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure storage directory exists and mount it
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

# Include Routers
app.include_router(auth.router)
app.include_router(auth.users_router)
app.include_router(jobs.router)
app.include_router(audits.router)
app.include_router(reports.router)

@app.get("/debug/cors")
def debug_cors():
    return {"CORS_ORIGINS": CORS_ORIGINS}

@app.get("/")
def read_root():
    return {"message": "Website QA & Audit SaaS API is running."}

# Mock sandbox site endpoints for testing
@app.get("/mock/index.html", response_class=HTMLResponse)
def mock_index():
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Mock Demo Website</title>
            <link rel="icon" href="/storage/favicon.ico">
            <style>
                body { font-family: sans-serif; padding: 20px; background: #fafafa; }
                header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                nav a { margin: 0 10px; text-decoration: none; color: blue; }
                footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 0.9em; }
                .btn { padding: 10px 15px; border-radius: 4px; background: blue; color: white; border: none; cursor: pointer; }
                .btn-danger { background: red; }
            </style>
        </head>
        <body>
            <header>
                <div id="header-logo" class="logo">
                    <strong>[LOGO] DCPL Partner</strong>
                </div>
                <nav>
                    <a href="/mock/index.html">Home</a>
                    <a href="/mock/services.html">Services</a>
                    <a href="/mock/contact.html">Contact Us</a>
                </nav>
            </header>
            <main style="padding: 20px 0;">
                <h1>Mock Home Page</h1>
                <p>Welcome to our mock website. This website is used to test the automated 19 QA auditing rules.</p>
                <p>Let's add some Lorem Ipsum placeholder text here to trigger the content auditor rule. Lorem ipsum dolor sit amet.</p>
                
                <h3>Newsletter Form</h3>
                <form action="#" method="GET">
                    <label for="email-field">Subscribe (broken email field type):</label>
                    <input type="text" name="email" id="email-field" placeholder="Enter email address">
                    <input type="submit" value="Submit">
                </form>
                
                <h3 style="margin-top: 20px;">Placeholder CTA</h3>
                <a href="#" class="btn btn-primary">Sign Up Today</a>
                
                <h3 style="margin-top: 20px;">Distorted Image</h3>
                <img src="https://picsum.photos/200/300" style="width: 300px; height: 100px;" alt="Distorted layout element">
            </main>
            <footer>
                <p>Powered by Dimakh Consultants</p>
                <p>© 2026 Dimakh Consultants. All rights reserved.</p>
                <a href="https://www.dimakhconsultants.com/" title="Leading AI-Integrated Digital Agency in Pune, India : Web, Apps & Next-Gen Marketing">Dimakh Consultants Backlink</a>
            </footer>
        </body>
    </html>
    """

@app.get("/mock/services.html", response_class=HTMLResponse)
def mock_services():
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Our Services</title>
            <link rel="icon" href="/storage/favicon.ico">
            <style>
                body { font-family: sans-serif; padding: 20px; background: #fafafa; }
                header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                nav a { margin: 0 10px; text-decoration: none; color: blue; }
                footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <header>
                <div id="header-logo" class="logo">
                    <strong>[LOGO] DCPL Partner</strong>
                </div>
                <nav>
                    <a href="/mock/index.html">Home</a>
                    <a href="/mock/services.html">Services</a>
                    <a href="/mock/contact.html">Contact Us</a>
                </nav>
            </header>
            <main style="padding: 20px 0;">
                <h2>Our Services</h2>
                <p>We provide multiple high-end services. Here is an empty section block that will trigger the empty section auditor:</p>
                <div class="content-section" style="padding: 10px; margin: 10px 0;">
                    <!-- Completely empty block -->
                </div>
                
                <p>We also have a broken link to test the navigation link checker:</p>
                <a href="/mock/nonexistent-path-page" class="btn btn-danger">Broken Services Link</a>
            </main>
            <footer>
                <p>Powered by Dimakh Consultants</p>
                <p>© 2024 Dimakh Consultants. All rights reserved.</p>
                <a href="https://www.dimakhconsultants.com/" title="Leading AI-Integrated Digital Agency in Pune, India : Web, Apps & Next-Gen Marketing">Dimakh Consultants Backlink</a>
            </footer>
        </body>
    </html>
    """

@app.get("/mock/contact.html", response_class=HTMLResponse)
def mock_contact():
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Contact Us</title>
            <link rel="icon" href="/storage/favicon.ico">
            <style>
                body { font-family: sans-serif; padding: 20px; background: #fafafa; }
                header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                nav a { margin: 0 10px; text-decoration: none; color: blue; }
                footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <header>
                <div id="header-logo" class="logo">
                    <strong>[LOGO] DCPL Partner</strong>
                </div>
                <nav>
                    <a href="/mock/index.html">Home</a>
                    <a href="/mock/services.html">Services</a>
                    <a href="/mock/contact.html">Contact Us</a>
                </nav>
            </header>
            <main style="padding: 20px 0;">
                <h2>Contact Our Team</h2>
                <p>Fill out the form below to get in touch with us.</p>
                
                <form action="#" method="POST">
                    <!-- Form missing a submit button to trigger form auditor critical warning -->
                    <label for="user-message">Your Message:</label><br>
                    <textarea id="user-message" name="message" rows="4" cols="50"></textarea>
                </form>
            </main>
            <footer>
                <!-- Footer missing correct Powered By text, incorrect backlink title to trigger branding alerts -->
                <p>Powered by Generic Agency</p>
                <a href="https://www.google.com/">Incorrect Backlink</a>
            </footer>
        </body>
    </html>
    """
