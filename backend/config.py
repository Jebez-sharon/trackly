#config.py

import os
from datetime import timedelta
from dotenv import load_dotenv

#load_dotenv() reads the .env file and makes its values available

load_dotenv()

def _normalize_db_url(url):
    if url and url.startswith('postgres://'):
        return url.replace('postgres://','postgresql://',1)
    return url

class Config:

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    SQLALCHEMY_DATABASE_URI = _normalize_db_url(os.environ.get('DATABASE_URL'))

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 1800,
    }

    

