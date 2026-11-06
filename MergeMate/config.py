import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class Config:
    """Application configuration for MergeMate Flask & PyMongo application."""
    
    SECRET_KEY = os.environ.get('SECRET_KEY', 'mergemate-college-dbms-secret-key-2026')
    
    # MongoDB Connection URI (default local MongoDB Community Server, no password required)
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://127.0.0.1:27017/')
    
    # MongoDB Database Name
    MONGO_DBNAME = os.environ.get('MONGO_DBNAME', 'mergemate_db')
    
    # Debug mode
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
