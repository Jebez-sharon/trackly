# models.py — inside backend/
# Defines the database tables (as Python classes) using
# SQLAlchemy's ORM. Each class here becomes a real table in
# PostgreSQL once we run migrations.

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

# db is the SQLAlchemy toolkit object. Creating it here (not in
# app.py) lets other files import this same db/User/Bug objects
# without circular import errors — the same pattern we used in
# the Intermediate project.

db = SQLAlchemy()

def utcnow():
    return datetime.now(timezone.utc)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50) , unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash= db.Column(db.String(255), nullable=False)


    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

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
        }

class Organization(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name= db.Column(db.String(100), nullable=False)

    slug = db.Column(db.String(50), unique=True, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    projects = db.relationship(
        'Project', backref='organization', lazy=True, cascade='all, delete-orphan'
    )
    memberships = db.relationship(
        'OrganizationMember',
        backref='organization',
        lazy=True,
        cascade='all , delete-orphan'
    )
    labels = db.relationship('Label', backref='organization', lazy=True, cascade='all, delete-orphan')


    def to_dict(self):
        # Summary view — counts instead of full nested lists, kept light.
        return {
            'id':self.id,
            'name':self.name,
            'slug':self.slug,
            'member_count':len(self.memberships),
            'project_count':len(self.projects)
        }
    

class OrganizationMember(db.Model):
     # Join table between User and Organization.
    id= db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organization.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)

    role = db.Column(db.String(20), nullable=False, default='member')

    joined_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    user= db.relationship('User', backref='organization_memberships')

    __table_args__ = (
        db.UniqueConstraint('organization_id','user_id', name='unique_org_membership'),
    )

    def to_dict(self):
        return {
            'id':self.id,
            'user':self.user.to_dict(),
            'organization':self.organization.to_dict(),
            'role':self.role,
            'joined_at':self.joined_at.isoformat()
        }



class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    key = db.Column(db.String(10), nullable=False)
    description = db.Column(db.Text, nullable=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organization.id'), nullable=False, index=True)
    owner_id=db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    owner = db.relationship('User', backref='owned_projects')

# Tracks the next issue number to assign within this project.
    issue_counter = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    issues = db.relationship(
        'Issue',
        backref='project',
        lazy=True,
        cascade='all, delete-orphan'
    )
    __table_args__ = (
        db.UniqueConstraint('organization_id','key', name='unique_project_key_per_org'),
    )

    def to_dict(self):
        return {
            'id':self.id,
            'name':self.name,
            'key':self.key,
            'description':self.description,
            'organization_id':self.organization_id,
            'owner':self.owner.to_dict(),
            'issue_count':len(self.issues)
        }

issue_labels = db.Table(
    'issue_labels',
    db.Column('issue_id', db.Integer, db.ForeignKey('issue.id'), primary_key=True),
    db.Column('label_id', db.Integer, db.ForeignKey('label.id'), primary_key=True)
)

class Label(db.Model):
    id = db.Column(db.Integer,primary_key=True)
    name= db.Column(db.String(30), nullable=False)
    organization_id = db.Column(
        db.Integer, db.ForeignKey('organization.id'), nullable=False, index=True
    )

    issues = db.relationship('Issue', secondary=issue_labels, back_populates='labels')

    __table_args__ = (
        db.UniqueConstraint('organization_id', 'name', name='unique_label_per_org'),
    )

    def to_dict(self):
        return {'id':self.id,
                'name':self.name
                }

class Issue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    issue_key = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    steps_to_reproduce = db.Column(db.Text, nullable=True)
    issue_type = db.Column(db.String(20), default='bug')
    # 5-level priority, matching the Linear-style scale we
    # planned — not the old 4-level severity scheme.
    priority = db.Column(db.String(20), default='no_priority', index=True)
    # no_priority, low, medium, high, urgent
    severity = db.Column(db.String(20), default='low')
    category = db.Column(db.String(30), default='general')
    status = db.Column(db.String(30), default='new', index=True)
    # new, in-progress, ready-for-test, closed

    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False,index=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False,index=True)
    assignee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True,index=True)

    reporter = db.relationship('User', foreign_keys=[reporter_id], backref='reported_issues')
    assignee = db.relationship('User', foreign_keys=[assignee_id], backref='assigned_issues')

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, index=True)

    updated_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    comments = db.relationship(
        'Comment',
        backref = 'issue',
        lazy = True,
        cascade='all, delete-orphan'
    )

    activities = db.relationship(
        'IssueActivity', backref='issue', lazy=True, cascade = 'all , delete-orphan'
    )
    attachments = db.relationship(
        'Attachment', backref='issue', lazy=True, cascade='all, delete-orphan'
    )
    labels = db.relationship(
        'Label', secondary=issue_labels, back_populates='issues'
    )

    def to_dict(self):
        return{
            'id':self.id,
            'issue_key':self.issue_key,
            'title':self.title,
            'description':self.description,
            'steps_to_reproduce':self.steps_to_reproduce,
            'issue_type':self.issue_type,
            'priority':self.priority,
            'severity':self.severity,
            'category':self.category,
            'status':self.status,
            'created_at':self.created_at.isoformat(),
            'updated_at':self.updated_at.isoformat(),
            'reporter':self.reporter.to_dict(),
            'assignee':self.assignee.to_dict() if self.assignee else None,
            'comment_count':len(self.comments)
        }

    def to_dict_detailed(self):
        data = self.to_dict()
        data['description'] = self.description
        data['steps_to_reproduce'] = self.steps_to_reproduce
        data['comments'] = [c.to_dict() for c in self.comments]
        data['activities'] = [a.to_dict() for a in self.activities]
        data['attachments'] = [a.to_dict() for a in self.attachments]
        return data

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    issue_id = db.Column(db.Integer, db.ForeignKey('issue.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False,index=True)

    author = db.relationship('User', backref='comments')

    def to_dict(self):
        return{
            'id':self.id,
            'message':self.message,
            'created_at':self.created_at.isoformat(),
            'author':self.author.to_dict()
        }

class IssueActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issue.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)

    action = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.String(100), nullable=True)
    new_value = db.Column(db.String(100), nullable=True)

    extra_data = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    user = db.relationship('User', backref='activities')

    def to_dict(self):
        return {
            'id':self.id,
            'action':self.action,
            'old_value':self.old_value,
            'new_value':self.new_value,
            'extra_data':self.extra_data,
            'created_at':self.created_at.isoformat(),
            'user':self.user.to_dict()
        }

class Attachment(db.Model):
    # Metadata only — actual files live on disk (or later, cloud
    # storage), never as binary data inside PostgreSQL.
    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issue.id'), nullable=False, index=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    filename= db.Column(db.String(255), nullable=False)
    file_path= db.Column(db.String(500), nullable=False)
    file_size= db.Column(db.Integer, nullable=True)
    mime_type= db.Column(db.String(100), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    uploader = db.relationship('User', backref='uploaded_attachments')

    def to_dict(self):
        return {
            'id':self.id,
            'filename':self.filename,
            'file_path':self.file_path,
            'file_size':self.file_size,
            'mime_type':self.mime_type,
            'created_at':self.created_at.isoformat()
        }