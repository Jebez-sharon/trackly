#config.py
#This file centralizes all app configuration in one place, so
#app.py doesnt get cluttered with settings , and so different
#enviroments (developement , testing , production) can each have
#their own config class if needed later

import os
from datetime import timedelta
from dotenv import load_dotenv

#load_dotenv() reads the .env file and makes its values available
# through os.environ, as if they were real system environment
# variables. Without calling this , os.environ.get() below would
# return None even though .env has the values written in it.

load_dotenv()

class Config:

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    #os.environ.get('KEY') reads the value of KEY from the
    # environment. Since load_dotenv() loaded .env into the
    # environment above, this picks up DATABASE_URL and
    # JWT_SECRET_KEY exactly as you wrote them.
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

    # Flask-SQLAlchemy's change-tracking feature — it watches for
    # object modifications to emit signals. We don't use that
    # feature, and leaving it on adds unnecessary overhead, so we
    # explicitly disable it.
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # This is the secret flask-jwt-extended uses to sign and
    # verify tokens (the "signature" I explained earlier). It must
    # come from .env, never be hardcoded, since this file
    # (config.py) gets pushed to GitHub but .env does not.
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

    

