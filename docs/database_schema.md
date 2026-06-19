# Database Schema

## users

Stores user accounts.

Fields:

* id
* name
* email
* password_hash
* is_active
* created_at
* updated_at

---

## audit_jobs

Tracks audit execution.

Fields:

* id
* user_id
* website_url
* status
* progress_percentage
* started_at
* completed_at
* created_at

Status Values:

* PENDING
* RUNNING
* COMPLETED
* FAILED

---

## audits

Stores completed audit summaries.

Fields:

* id
* audit_job_id
* overall_health_score

Category Scores:

* seo_score

* performance_score

* accessibility_score

* responsiveness_score

* forms_score

* navigation_score

* security_score

* content_score

* branding_score

* total_pages_scanned

* created_at

---

## findings

Stores all detected issues.

Fields:

* id
* audit_id
* issue_code
* category
* page_url
* severity
* title
* description
* business_impact
* developer_fix
* source
* confidence
* screenshot_id
* created_at

Severity Values:

* CRITICAL
* HIGH
* MEDIUM
* LOW

Confidence Values:

* HIGH
* MEDIUM
* LOW

Sources:

* playwright
* lighthouse
* axe
* beautifulsoup
* custom

---

## screenshots

Stores captured screenshots.

Fields:

* id
* audit_id
* page_url
* file_path
* reason
* created_at

---

## reports

Stores generated reports.

Fields:

* id
* audit_id
* report_type
* file_path
* created_at

Report Types:

* CLIENT
* DEVELOPER

---

## Relationships

users
↓
audit_jobs
↓
audits
↓
findings

audits
↓
screenshots

audits
↓
reports
