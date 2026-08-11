# HTTP layer for projects: create a project within an org, and
# list projects the current user has access to.
from flask import Blueprint, request,jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Project, OrganizationMember

project_bp = Blueprint('projects', __name__)

@project_bp.route('/organizations/<int:organization_id>/projects', methods=['GET'])
@jwt_required()
def list_projects(organization_id):
    # Same multi-tenant check as issues: confirm membership before
    # returning anything from this organization.
    current_user_id = int(get_jwt_identity())
    membership = OrganizationMember.query.filter_by(
        organization_id=organization_id, user_id=current_user_id
    ).first()
    if not membership:
        return jsonify({'error':'You do not have access to this organization'}), 403

    projects = Project.query.filter_by(organization_id=organization_id).all()
    return jsonify([p.to_dict() for p in projects]),200

@project_bp.route('/organizations/<int:organization_id>/projects', methods=['POST'])
@jwt_required()
def create_project(organization_id):
    current_user_id = int(get_jwt_identity())

    membership = OrganizationMember.query.filter_by(
        organization_id=organization_id, user_id = current_user_id
    ).first()
    if not membership:
        return jsonify({'error':'You do not have access to this organization'}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error':'JSON body is required'}), 400

    name = data.get('name')
    key = data.get('key')
    if not name or not key:
        return jsonify({'error':'Name and key are required'}), 400

    key = key.upper()

    existing =  Project.query.filter_by(organization_id=organization_id, key=key).first()
    if existing:
        return jsonify({'error':f'Project key "{key}" is already used in this organization'}),409

    project = Project(
        name= name,
        key= key,
        description = data.get('description'),
        organization_id = organization_id,
        owner_id = current_user_id
    )
    try:
        db.session.add(project)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return jsonify(project.to_dict()), 201