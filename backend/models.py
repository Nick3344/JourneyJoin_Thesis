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
    acs_id = db.Column(db.String(255), nullable=True)

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
    


class Guide(db.Model):
    __tablename__ = "guides"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    full_name = db.Column(db.String(100), nullable=True)
    contact_email = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)

    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True)

    bio = db.Column(db.Text, nullable=True)
    
    areas_of_expertise = db.Column(db.Text, nullable=True)  # e.g. JSON: ["historical", "food", "culture"]
    languages = db.Column(db.Text, nullable=True)          # e.g. JSON: ["English", "Spanish"]

    experience_years = db.Column(db.Integer, default=0)    
    rating = db.Column(db.Float, default=0.0)              # Similar to 'credibility_score', average rating from travelers

    # Service Offerings
    # Could store as JSON for flexible structure, e.g.:
    # { 
    #   "offerings": ["City walking tours", "Food tasting"],
    #   "price_range": "$$",
    #   "availability": "Weekends only"
    # }
    service_offerings = db.Column(db.Text, nullable=True)

    # Tour details
    # Another JSON field to store sample itineraries, etc.
    # e.g. [
    #   { 
    #     "title": "Budapest Highlights", 
    #     "duration": "4 hours", 
    #     "description": "...some text..." 
    #   }
    # ]
    tour_details = db.Column(db.Text, nullable=True)
    
    profile_pic = db.Column(db.String(255), nullable=True)   # path to uploaded file


    def __init__(self, username, password):
        self.username = username
        self.set_password(password)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def set_areas_of_expertise(self, areas_list):
        self.areas_of_expertise = json.dumps(areas_list)

    def get_areas_of_expertise(self):
        if not self.areas_of_expertise:
            return []
        try:
            return json.loads(self.areas_of_expertise)
        except:
            return []

    def set_languages(self, langs_list):
        self.languages = json.dumps(langs_list)

    def get_languages(self):
        if not self.languages:
            return []
        try:
            return json.loads(self.languages)
        except:
            return []

    def set_service_offerings(self, offerings_dict):
        self.service_offerings = json.dumps(offerings_dict)

    def get_service_offerings(self):
        if not self.service_offerings:
            return {}
        try:
            return json.loads(self.service_offerings)
        except:
            return {}

    def set_tour_details(self, tours_list):
        self.tour_details = json.dumps(tours_list)

    def get_tour_details(self):
        if not self.tour_details:
            return []
        try:
            return json.loads(self.tour_details)
        except:
            return []

    def __repr__(self):
        return f"<Guide {self.username}>"
    
class ChatThread(db.Model):
    __tablename__ = "chat_threads"
    thread_id = db.Column(db.String(255), primary_key=True)
    topic = db.Column(db.String(255), nullable=False)
    participants = db.Column(db.JSON, nullable=False)  
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ChatThread {self.thread_id} - {self.topic}>"
    
class ChatThreadMapping(db.Model):
    __tablename__ = 'chat_thread_mappings'
    id = db.Column(db.Integer, primary_key=True)
    thread_id = db.Column(db.String(255), nullable=False)
    participant1_id = db.Column(db.String(255), nullable=False)
    participant2_id = db.Column(db.String(255), nullable=False)
    topic = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def get_thread_for_users(user1_id, user2_id):
        return ChatThreadMapping.query.filter(
            ((ChatThreadMapping.participant1_id == user1_id) & (ChatThreadMapping.participant2_id == user2_id)) |
            ((ChatThreadMapping.participant1_id == user2_id) & (ChatThreadMapping.participant2_id == user1_id))
        ).first()


