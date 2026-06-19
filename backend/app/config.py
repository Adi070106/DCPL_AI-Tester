import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
SCREENSHOT_DIR = STORAGE_DIR / "screenshots"
REPORT_DIR = STORAGE_DIR / "reports"

# Create directories
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Security
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_key_for_website_qa_tester_2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# CORS - comma-separated origins from env, with local defaults
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://192.168.56.1:3000"
).split(",")
