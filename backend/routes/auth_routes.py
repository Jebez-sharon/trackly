# routes/auth_routes.py — registration and login.

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from routes.utils import json_body
from models import db, User, Organization, OrganizationMember

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def _clean(value):
    return value.strip() if isinstance(value, str) else ''

@auth_bp.route('/register', methods=['POST'])
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

    if len(password)< 8:
        return jsonify({'error':'Password must be'
        ' atleast 8 characters.'}),400
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