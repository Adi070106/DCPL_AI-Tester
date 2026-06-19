import bcrypt

hashed = "$2b$12$ycWZ9DDabUkUwHRfWS1kXu.b6.upTu59tUHRjZo8mMffU8QwoU6Um"

passwords = ["password", "password123", "tester", "tester123", "admin", "admin123"]
for p in passwords:
    try:
        res = bcrypt.checkpw(p.encode('utf-8'), hashed.encode('utf-8'))
        print(f"Password '{p}': {res}")
    except Exception as e:
        print(f"Password '{p}' error: {e}")
