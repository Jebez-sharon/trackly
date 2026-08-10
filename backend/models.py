# models.py — inside backend/
# Defines the database tables (as Python classes) using
# SQLAlchemy's ORM. Each class here becomes a real table in
# PostgreSQL once we run migrations.

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# db is the SQLAlchemy toolkit object. Creating it here (not in
# app.py) lets other files import this same db/User/Bug objects
# without circular import errors — the same pattern we used in
# the Intermediate project.

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50) , unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash= db.Column(db.String(255), nullable=False)

    role = db.Column(db.String(20), nullable=False, default='member')

    created_at = db.Column(db.DateTime, default= datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        # Converts a User object into a plain Python dictionary,
        # which Flask can then turn into JSON with jsonify().
        # Notice password_hash is deliberately left out — an API
        # response should never expose password data, even
        # hashed, to the frontend.
        return{
            'id':self.id,
            'username':self.username,
            'email':self.email,
            'role':self.role
        }