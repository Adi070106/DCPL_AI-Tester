import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, name, email, custom_brand_name FROM users")
    users = cursor.fetchall()
    print("Users in DB:")
    for user in users:
        print(f"ID: {user[0]}, Name: {user[1]}, Email: {user[2]}, Brand: {user[3]}")
        if user[3] is None:
            print(f"  Brand is NULL! Fixing it to 'DCPL AI-Tester'...")
            cursor.execute("UPDATE users SET custom_brand_name = 'DCPL AI-Tester' WHERE id = ?", (user[0],))
            
    conn.commit()
    print("All NULL custom_brand_name records have been resolved.")
except Exception as e:
    print(f"Error checking brand names: {e}")
finally:
    conn.close()
