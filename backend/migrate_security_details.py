import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "app.db")
print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def column_exists(table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns

try:
    if not column_exists("audits", "security_details"):
        print("Adding column security_details to audits table...")
        cursor.execute("ALTER TABLE audits ADD COLUMN security_details TEXT")
        conn.commit()
        print("Database migration successful!")
    else:
        print("Column security_details already exists in audits table.")
except Exception as e:
    conn.rollback()
    print(f"Database migration failed: {e}")
finally:
    conn.close()
