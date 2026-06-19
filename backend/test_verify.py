from app.database import SessionLocal
from app.models import User
from app.utils.auth import verify_password

db = SessionLocal()
user = db.query(User).filter(User.email == "aditya.gunjal@dimakhconsultants.com").first()
if user:
    print(f"Found user: {user.email}")
    is_valid = verify_password("password123", user.password_hash)
    print(f"Is password valid: {is_valid}")
else:
    print("User not found!")
db.close()
