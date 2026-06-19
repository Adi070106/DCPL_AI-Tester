import sqlite3
import os

db_path = "app.db"
if not os.path.exists(db_path):
    db_path = "backend/app.db"
    if not os.path.exists(db_path):
        db_path = "../backend/app.db"

print(f"Checking database at {db_path}...")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # 1. Update 'users' table
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [row[1] for row in cursor.fetchall()]
        if "brand_rules" not in user_columns:
            print("Adding 'brand_rules' column to 'users' table...")
            cursor.execute("ALTER TABLE users ADD COLUMN brand_rules TEXT;")
            conn.commit()
            print("Column 'brand_rules' added successfully!")
        else:
            print("Column 'brand_rules' already exists in 'users' table.")

        # 2. Update 'audits' table
        cursor.execute("PRAGMA table_info(audits)")
        audit_columns = [row[1] for row in cursor.fetchall()]
        
        new_audit_cols = {
            "slowest_pages": "TEXT",
            "heavy_assets": "TEXT",
            "broken_links": "TEXT",
            "page_seo": "TEXT"
        }

        for col, col_type in new_audit_cols.items():
            if col not in audit_columns:
                print(f"Adding '{col}' column to 'audits' table...")
                cursor.execute(f"ALTER TABLE audits ADD COLUMN {col} {col_type};")
                conn.commit()
                print(f"Column '{col}' added successfully!")
            else:
                print(f"Column '{col}' already exists in 'audits' table.")

    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()
else:
    print("Database file not found.")
