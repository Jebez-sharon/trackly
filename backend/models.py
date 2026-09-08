from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import select, func
from sqlalchemy.orm import column_property
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

def utcnow():
    return datetime.now(timezone.utc)

class User(db.Model):
    id= db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return{
            'id':self.id,
            'username':self.username,
            'email':self.email,
        }

class Organization(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name=db.Column(db.String(100), nullable=False)
    slug= db.Column(db.String(50), unique=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True,index=True)

    memberships = db.relationship(
        'OrganizationMember',
        backref='organization',
        lazy=True,
        cascade='all, delete-orphan',
    )

    projects = db.relationship(
        'Project',
        backref='organization',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return{
            'id':self.id,
            'name':self.name,
            'slug':self.slug,
            'member_count': len(self.memberships),
            'project_count':len(self.projects),
            'created_by':self.created_by,
        }

class OrganizationMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(
        db.Integer, db.ForeignKey('organization.id'), nullable=False,
        index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)

    role= db.Column(db.String(20), nullable=False, default='member')
    joined_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    user = db.relationship('User', backref='organization_memberships')

    __table_args__ = (
        db.UniqueConstraint('organization_id','user_id',
                            name='unique_org_membership'),
    )

    def to_dict(self):
        return {
            'id':self.id,
            'user':self.user.to_dict(),
            'organization':self.organization.to_dict(),
            'role':self.role,
            'joined_at':self.joined_at.isoformat(),
        }


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    key = db.Column(db.String(10), nullable=False)
    description = db.Column(db.Text, nullable = True)

    organization_id = db.Column(db.Integer, db.ForeignKey('organization.id'), nullable=False, index=True)

    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)

    issue_counter = db.Column(db.Integer, default= 0)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    owner = db.relationship('User', backref='owned_projects')

    issues = db.relationship(
        'Issue',
        backref='project',
        lazy=True,
        cascade ='all, delete-orphan',
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
            'issue_count':len(self.issues),
        }

class Issue(db.Model):
    id = db.Column(db.Integer, primary_key= True)
    issue_key = db.Column(db.String(20), nullable=False, index=True)

    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable = False)
    steps_to_reproduce = db.Column(db.Text, nullable=True)

    issue_type = db.Column(db.String(20), default='bug')
    priority = db.Column(db.String(20), default='no_priority', index=True)
    severity = db.Column(db.String(20), default='low')
    category = db.Column(db.String(30), default ='general')
    status = db.Column(db.String(30), default = 'new', index=True)

    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False, index=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    assignee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True, index=True)

    reporter = db.relationship('User',foreign_keys=[reporter_id], backref='reported_issues')
    assignee = db.relationship('User',foreign_keys=[assignee_id], backref='assigned_issues')

    created_at = db.Column(db.DateTime(timezone = True), default = utcnow , index=True)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate = utcnow)

    activities = db.relationship(
        'IssueActivity',
        backref='issue',
        lazy=True,
        cascade='all, delete-orphan'
    )

    comments = db.relationship(
        'Comment',
        backref='issue',
        lazy=True,
        cascade='all, delete-orphan',
    )

    __table_args__ = (
        db.UniqueConstraint('project_id','issue_key',
                            name= 'unique_issue_key_per_project'),
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
            'project_id':self.project_id,
            'created_at':self.created_at.isoformat(),
            'updated_at':self.updated_at.isoformat(),
            'reporter':self.reporter.to_dict(),
            'assignee':self.assignee.to_dict() if self.assignee else None,
            'comment_count':self.comment_count,
        }

    def to_dict_detailed(self):
        data = self.to_dict()
        data['activities'] = [a.to_dict() for a in self.activities]
        data['comments'] = [c.to_dict() for c in self.comments]
        return data


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
        return{
            'id':self.id,
            'action':self.action,
            'old_value':self.old_value,
            'new_value':self.new_value,
            'extra_data':self.extra_data,
            'created_at':self.created_at.isoformat(),
            'user':self.user.to_dict(),
        }

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    issue_id = db.Column(
        db.Integer, db.ForeignKey('issue.id'), nullable=False, index=True
    )

    user_id = db.Column(
        db.Integer, db.ForeignKey('user.id'), nullable=False, index=True
    )

    author = db.relationship('User', backref='comments')

    def to_dict(self):
        return {
            'id':self.id,
            'message':self.message,
            'created_at':self.created_at.isoformat(),
            'author':self.author.to_dict(),
        }

Issue.comment_count = column_property(
    select(func.count(Comment.id))
    .where(Comment.issue_id == Issue.id)
    .correlate_except(Comment)
    .scalar_subquery()
)