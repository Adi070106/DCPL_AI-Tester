# Website QA & Audit SaaS - Architecture

## Purpose

An internal SaaS platform for Dimakh Consultants that performs automated website quality audits and generates client-friendly and developer-friendly reports.

---

## High Level Architecture

Frontend (Next.js)
↓
Backend API (FastAPI)
↓
Audit Engine
├── Playwright
├── Lighthouse
├── Axe-Core
├── BeautifulSoup
└── Custom Auditors
↓
PostgreSQL
↓
Reports & Screenshots

---

## Frontend Stack

* Next.js 15 (App Router)
* JavaScript
* CSS Modules
* React Hook Form
* Zod
* Axios
* Recharts

---

## Backend Stack

* FastAPI
* SQLAlchemy
* Alembic
* PostgreSQL

---

## Audit Tools

### Playwright

Used for:

* Navigation testing
* Responsive testing
* Form testing
* CTA testing
* User journey testing
* Screenshot capture
* Link validation

### Lighthouse

Used for:

* Performance
* SEO
* Best Practices
* Accessibility Score

### Axe-Core

Used for:

* Accessibility violations
* Contrast checks
* Missing labels
* Missing alt text

### BeautifulSoup

Used for:

* Metadata checks
* Heading structure
* Footer compliance
* Content analysis

---

## Authentication

V1 Features:

* Register
* Login
* Logout

Authentication Method:

* Email + Password

---

## Audit Flow

User Login
↓
Create Audit
↓
Audit Job Created
↓
Crawler Discovers Pages
↓
Auditors Execute
↓
Findings Generated
↓
Health Score Calculated
↓
Reports Generated
↓
Download PDF

---

## Crawl Rules

* Same domain only
* Maximum pages: 50
* Ignore external domains
* Ignore image URLs
* Ignore PDFs
* Ignore downloadable files

---

## Report Types

### Client Report

Contains:

* Executive Summary
* Health Score
* Key Issues
* Recommendations

### Developer Report

Contains:

* Issue IDs
* URLs
* Screenshots
* Technical Fixes
* Severity

---

## Storage

Store:

* Audit Results
* Findings
* Screenshots
* Reports

Screenshots should only be captured for High and Critical issues.

---

## Future Scope

* Public SaaS
* Multi-user support
* Team collaboration
* Scheduled audits
* AI-powered summaries
* Cloud storage
