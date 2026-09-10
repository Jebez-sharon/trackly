# routes/auth_routes.py — registration and login.

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from routes.utils import json_body
from extensions import limiter
from models import db, User, Organization, OrganizationMember

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def _clean(value):
    return value.strip() if isinstance(value, str) else ''


# Every one of these is a String(n) column. Without the check the value reaches
# Postgres and comes back as an unhandled 500 - on the one route that anyone
# can reach without credentials.
MAX_LENGTHS = {
    'username': 50,   # User.username
    'email': 120,     # User.email
    'org_name': 100,  # Organization.name
    'org_slug': 50,   # Organization.slug
}

# The hash is fixed width whatever goes in, so this is not about the column.
# It caps how much data one unauthenticated request can push through scrypt.
PASSWORD_MAX = 128

@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5 per hour; 20 per day')
def register():
    data = json_body()
    username = _clean(data.get('username'))
    email = _clean(data.get('email')).lower()
    password = data.get('password') if isinstance(data.get('password'), str) else ''

    org_name = _clean(data.get('org_name'))
    org_slug = _clean(data.get('org_slug')).lower()

    missing = [
        name for name , value in(
            ('username',username),
            ('email',email),
            ('password', password),
            ('org_name', org_name),
            ('org_slug', org_slug),
        ) if not value
    ]

    if missing:
        return jsonify({
            'error':'Missing required fields',
            'fields': missing
        }),400

    too_long = [
        name
        for name, value in (
            ('username', username),
            ('email', email),
            ('org_name', org_name),
            ('org_slug', org_slug),
        )
        if len(value) > MAX_LENGTHS[name]
    ]
    if too_long:
        return jsonify({
            'error':'Some fields are too long',
            'fields': too_long,
            'limits': {name: MAX_LENGTHS[name] for name in too_long},
        }),400

    if len(password)< 8:
        return jsonify({'error':'Password must be'
        ' atleast 8 characters.'}),400

    if len(password) > PASSWORD_MAX:
        return jsonify({
            'error':f'Password must be {PASSWORD_MAX} characters or fewer.'
        }),400
# check if user already exists
    
    if User.query.filter_by(email = email).first():
        return jsonify({'error':'That email is already registered'}),409
    if User.query.filter_by(username = username).first():
        return jsonify({'error':'That username is taken'}),409
    if Organization.query.filter_by(slug = org_slug).first():
        return jsonify({'error':'That organization slug is taken'}),409

    user = User(username= username, email= email)
    user.set_password(password)
    org = Organization(name=org_name, slug=org_slug)

    db.session.add_all([user, org])
    db.session.flush()  # assigns user.id and org.id without committing yet
    org.created_by = user.id

    db.session.add(OrganizationMember(
        organization_id = org.id, user_id = user.id, role='admin'
    ))

    db.session.commit()

    return jsonify({
        'user':user.to_dict(),
        'organization':org.to_dict()
    }), 201


@auth_bp.route('/login',methods=['POST'])
# Each attempt costs ~118ms of scrypt whether or not the email exists, so
# this protects the CPU as much as the accounts.
@limiter.limit('10 per minute; 100 per hour')
def login():
    data = json_body()
    email = _clean(data.get('email')).lower()
    password = data.get('password') if isinstance(data.get('password'), str) else ''

    if not email or not password:
        return jsonify({
            'error':'Email and password are required'
        }), 400

    user = User.query.filter_by(email = email).first()

    if user is None or not user.check_password(password):
        return jsonify({
            'error':'Invalid email or password'
        }),401

    token = create_access_token(identity=str(user.id))

    memberships = OrganizationMember.query.filter_by(user_id = user.id).all()

    return jsonify({
        'access_token':token,
        'user':user.to_dict(),
        'organizations':[
            {**m.organization.to_dict(), 'role':m.role} for m in memberships
        ],
    }),200