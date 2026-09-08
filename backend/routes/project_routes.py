from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from routes.utils import json_body

from models import db, Project
from routes.utils import current_user_id, get_membership, require_admin

project_bp = Blueprint('projects',__name__,url_prefix='/api/organizations')

@project_bp.route('/<int:org_id>/projects', methods=['GET'])
@jwt_required()
def listProjects(org_id):
    if get_membership(org_id) is None:
        return jsonify(
            {'error':'You are not a member of this organization.'}
        ), 403

    projects = Project.query.filter_by(
        organization_id = org_id
    ).order_by(Project.id).all()
    return jsonify(
        [p.to_dict() for p in projects]
    ),200

@project_bp.route('/<int:org_id>/projects', methods=['POST'])
@jwt_required()
def create_project(org_id):
    error = require_admin(org_id)
    if error:
        return error

    data = json_body()
    name= data.get('name').strip() if isinstance(data.get('name'), str) else ''
    key = data.get('key').strip().upper() if isinstance(data.get('key'), str) else ''
    description = data.get('description').strip() if isinstance (data.get('description'),str) else None

    if not name or not key:
        return jsonify({
            'error':'Name and key are required'
        }), 400

    if not key.isalnum() or not (1 <= len(key) <= 10):
        return jsonify({
            'error':'Key must be 1-10 letters or digits'
        }),400

    if Project.query.filter_by(organization_id = org_id , key = key).first():
        return jsonify({
            'error':f'Project key {key} already exists here'
        }),409

    project = Project(
        name=name,
        key = key,
        description = description,
        organization_id = org_id,
        owner_id = current_user_id()
    )

    db.session.add(project)
    db.session.commit()

    return jsonify(project.to_dict()),201


    

