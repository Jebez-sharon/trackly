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

class Bug(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    steps_to_reproduce = db.Column(db.Text, nullable=True)

    # 5-level priority, matching the Linear-style scale we
    # planned — not the old 4-level severity scheme.
    priority = db.Column(db.String(20), default='no_priority')
    # no_priority, low, medium, high, urgent

    category = db.Column(db.String(30), default='general')
    status = db.Column(db.String(30), default='new')
    # new, in-progress, ready-for-test, closed

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reporter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    reporter = db.relationship('User', foreign_keys=[reporter_id], backref='reported_bugs')
    assignee = db.relationship('User', foreign_keys=[assignee_id], backref='assigned_bugs')

    comments = db.relationship(
        'Comment',
        backref = 'bug',
        lazy = True,
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return{
            'id':self.id,
            'title':self.title,
            'description':self.description,
            'steps_to_reproduce':self.steps_to_reproduce,
            'priority':self.priority,
            'category':self.category,
            'status':self.status,
            'created_at':self.created_at.isoformat(),
            'reporter':self.reporter.to_dict(),
            'assignee':self.assignee.to_dict() if self.assignee else None,
            'comment_count':len(self.comments)
        }

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime,default=datetime.utcnow)

    bug_id = db.Column(db.Integer, db.ForeignKey('bug.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    author = db.relationship('User', backref='comments')

    def to_dict(self):
        return{
            'id':self.id,
            'message':self.message,
            'created_at':self.created_at.isoformat(),
            'author':self.author.to_dict()
        }

