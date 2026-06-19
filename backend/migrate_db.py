import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "app.db")
print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Helper function to check if column exists
def column_exists(table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns

try:
    # 1. Alter users table
    if not column_exists("users", "custom_brand_name"):
        print("Adding column custom_brand_name to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN custom_brand_name TEXT NOT NULL DEFAULT 'DCPL AI-Tester'")
    else:
        print("Column custom_brand_name already exists in users table.")

    # 2. Alter audit_jobs table
    if not column_exists("audit_jobs", "schedule"):
        print("Adding column schedule to audit_jobs table...")
        cursor.execute("ALTER TABLE audit_jobs ADD COLUMN schedule TEXT NOT NULL DEFAULT 'manual'")
    else:
        print("Column schedule already exists in audit_jobs table.")

    if not column_exists("audit_jobs", "last_scheduled_run"):
        print("Adding column last_scheduled_run to audit_jobs table...")
        cursor.execute("ALTER TABLE audit_jobs ADD COLUMN last_scheduled_run DATETIME")
    else:
        print("Column last_scheduled_run already exists in audit_jobs table.")

    # 3. Alter audits table
    if not column_exists("audits", "crawl_relations"):
        print("Adding column crawl_relations to audits table...")
        cursor.execute("ALTER TABLE audits ADD COLUMN crawl_relations TEXT")
    else:
        print("Column crawl_relations already exists in audits table.")

    conn.commit()
    print("Database migration successful!")

except Exception as e:
    conn.rollback()
    print(f"Database migration failed: {e}")
finally:
    conn.close()
