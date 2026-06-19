import sqlite3
import os
import bcrypt

db_path = os.path.join(os.path.dirname(__file__), "app.db")
print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, name, email, password_hash FROM users")
    users = cursor.fetchall()
    print(f"Total users found: {len(users)}")
    for user in users:
        print(f"ID: {user[0]}, Name: {user[1]}, Email: {user[2]}, Hash: {user[3]}")
        
        # Test verification of password
        # Let's see if we can check if it conforms to bcrypt/passlib format
        pwd_hash = user[3]
        print(f"  Hash type: {type(pwd_hash)}")
        if isinstance(pwd_hash, str):
            print(f"  Starts with $2b$: {pwd_hash.startswith('$2b$')}")
            print(f"  Starts with $2a$: {pwd_hash.startswith('$2a$')}")
            print(f"  Starts with $pbkdf2$: {pwd_hash.startswith('$pbkdf2$')}")
except Exception as e:
    print(f"Error checking users: {e}")
finally:
    conn.close()
