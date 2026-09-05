from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import db, OrganizationMember, Project, User
from routes.utils import get_membership, require_admin

org_bp = Blueprint('organizations',__name__, url_prefix='/api/organizations')

VALID_ROLES = {'admin','member'}

def _admin_count(org_id):
    return OrganizationMember.query.filter_by(
        organization_id = org_id, role ='admin'
    ).count()

@org_bp.route('/<int:org_id>/members', methods=['GET'])
@jwt_required()
def list_members(org_id):
    if get_membership(org_id) is None:
        return jsonify({
            'error':'You are not a member of this organization'
        }),403

    members = OrganizationMember.query.filter_by(
        organization_id = org_id
    ).order_by(OrganizationMember.id).all()
    return jsonify([m.to_dict() for m in members]),200

@org_bp.route('<int:org_id>/members', methods=['POST'])
@jwt_required()
def add_member(org_id):
    error = require_admin(org_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    email = data.get('email').strip().lower() if isinstance(data.get('email') , str) else ''
    role = data.get('role') or 'member'

    if not email:
        return jsonify({'error':'email is required'}),400
    if role not in VALID_ROLES:
        return jsonify({
            'error':f'role must be one of {sorted(VALID_ROLES)}'
        }),400

    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify({
            'error':'No user with that email has registered yet'
        }),404

    if OrganizationMember.query.filter_by(organization_id= org_id, user_id=user.id).first():
        return jsonify({'error':'That user is already a member'}),409

    membership = OrganizationMember(
        organization_id= org_id, 
        user_id = user.id,
        role=role
    )
    db.session.add(membership)
    db.session.commit()
    return jsonify(membership.to_dict()),201

@org_bp.route('<int:org_id>/members/<int:member_id>', methods=['PATCH'])
@jwt_required()
def change_role(org_id, member_id):
    error = require_admin(org_id)
    if error:
        return error

    membership = OrganizationMember.query.filter_by(
        id=member_id, organization_id=org_id
    ).first()
    if membership is None:
        return jsonify({'error':'Member not found'}),404

    data = request.get_json(silent=True) or {}
    role = data.get('role')
    if role not in VALID_ROLES:
        return jsonify({
            'error':f'role must be one of {sorted(VALID_ROLES)}'
        }),400

    if membership.role == 'admin' and role != 'admin' and _admin_count(org_id) == 1:
        return jsonify({'error':'Cannot demote the last admin'}),400

    membership.role = role
    db.session.commit()
    return jsonify(membership.to_dict()), 200

@org_bp.route('/<int:org_id>/members/<int:member_id>', methods=['DELETE'])
@jwt_required()
def remove_member(org_id, member_id):
    error = require_admin(org_id)
    if error:
        return error

    membership = OrganizationMember.query.filter_by(
        id=member_id, organization_id=org_id
    ).first()
    if membership is None:
        return jsonify({'error':'Member not found'}),404

    if membership.role == 'admin' and _admin_count(org_id)==1:
        return jsonify({'error':'Cannot remove the last admin'}),400

    owned = Project.query.filter_by(
        organization_id = org_id, owner_id = membership.user_id
    ).count()
    if owned:
        return jsonify({
            'error':f'That user owns {owned} project(s).Reassign them first.'
        }),409

    db.session.delete(membership)
    db.session.commit()
    return jsonify({'message':'Member removed'}),200
