# routes/auth_routes.py — inside backend/routes/
# Handles registration and login. Unlike the Intermediate
# project's session-based auth, these routes return JSON (not
# HTML pages) and issue JWT tokens instead of setting cookies.

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from models import db,User, Organization, OrganizationMember

auth_bp = Blueprint('auth', __name__)

MIN_PASSWORD_LENGTH = 8

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True)
    # request.get_json() parses the incoming JSON body sent by
    # React (via Axios) into a Python dictionary.
    
    if not data:
        return jsonify({'error':'JSON body is required'}), 400

    username= data.get('username')
    email = data.get('email')
    password = data.get('password')
    org_name = data.get('organization_name')
    org_slug = data.get('organization_slug')

    # Basic presence validation. 
    if not username or not email or not password or not org_name or not org_slug:
        return jsonify({'error': 'All fields are required'}), 400

    email = email.strip().lower()
    org_slug = org_slug.strip().lower()

    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({
            'error':f'Password must be at least {MIN_PASSWORD_LENGTH} characters'
        }), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error':'Email already registered'}), 409

    if Organization.query.filter_by(slug=org_slug).first():
        return jsonify({'error':'Organization slug already taken'}), 409
    
    # Check for existing email before creating the account
    try:
        user = User(username= username, email = email)
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        organization = Organization(name=org_name, slug=org_slug)
        db.session.add(organization)
        db.session.flush()

        membership = OrganizationMember(
            organization_id = organization.id,
            user_id =  user.id,
            role='admin'
        )
        db.session.add(membership)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({'message':'Account and organization created successfully'}),201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error':'JSON body is required'}), 400
    
    email = data.get('email')
    password =data.get('password')

    if not email or not password:
        return jsonify({'error':'Email and password are required'}),400

    email = email.strip().lower()

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error':'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    memberships = OrganizationMember.query.filter_by(user_id=user.id).all()

    return jsonify({
        'access_token':access_token,
        'user':user.to_dict(),
        'organizations':[m.to_dict() for m in memberships]
    }),200