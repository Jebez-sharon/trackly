# routes/auth_routes.py — inside backend/routes/
# Handles registration and login. Unlike the Intermediate
# project's session-based auth, these routes return JSON (not
# HTML pages) and issue JWT tokens instead of setting cookies.

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from models import db,User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    # request.get_json() parses the incoming JSON body sent by
    # React (via Axios) into a Python dictionary.
    username= data.get('username')
    email = data.get('email')
    password = data.get('password')

    # Basic presence validation. 
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400

    # Check for existing email before creating the account
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error':'Email already registered'}), 409

    user = User(username= username, email = email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message':'Account created successfully'}),201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password =data.get('password')
    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error':'Invalid email or password'}), 401

    access_token = create_access_token(identity=user.id)

    return jsonify({
        'access_token':access_token,
        'user':user.to_dict()
    }),200