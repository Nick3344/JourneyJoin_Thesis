from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Extended profile fields
    profile_pic = db.Column(db.String(255), nullable=True)   # path to uploaded file
    city = db.Column(db.String(100), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    interests = db.Column(db.Text, nullable=True)  # store as JSON string
    successful_trips = db.Column(db.Integer, default=0)
    credibility_score = db.Column(db.Float, default=0.0)

    def __init__(self, username, password):
        self.username = username
        self.set_password(password)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_interests(self):
        """
        Convenience method to parse the user's interests as a Python list.
        """
        try:
            return json.loads(self.interests) if self.interests else []
        except:
            return []

    def __repr__(self):
        return f"<User {self.username}>"

