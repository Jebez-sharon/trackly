# app.py — inside backend/
# The application factory. This creates and configures the Flask
# app, connects the database, sets up JWT, and registers routes.

from flask import Flask
from flask_jwt_extended import  JWTManager
from config import Config
from models import db

def create_app():
    # create_app() wraps everything in a function instead of
    # running it at import time. This is the "Application
    # Factory" pattern — it lets you create multiple app
    # instances with different configs (useful for testing later,
    # where we'll want a separate test database).
    app = Flask(__name__)

    # from_object() reads every uppercase attribute off the
    # Config class and loads it into app.config. This is why
    # Config's attributes (SQLALCHEMY_DATABASE_URI,
    # JWT_SECRET_KEY) had to be written in uppercase.

    app.config.from_object(Config)

    # Connects the db object (defined in models.py) to this
    # specific Flask app instance.
    db.init_app(app)

    # JWTManager is flask-jwt-extended's core object. Once
    # initialized with the app, it knows how to create tokens
    # (using JWT_SECRET_KEY from config) and verify them on
    # protected routes.
    jwt = JWTManager(app)

    # Blueprints group related routes together. We'll create
    # auth_routes.py next — importing it here, inside create_app()
    # rather than at the top of the file, avoids circular import
    # issues (auth_routes.py will need to import 'db' from
    # models.py, and models.py doesn't need to know about routes).

    from routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug= True)

