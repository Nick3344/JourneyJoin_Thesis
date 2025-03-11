import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-jwt-secret")

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///test.db")
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)     # 1 day
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(hours=12)  # 12 hours

