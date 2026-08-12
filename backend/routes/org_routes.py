# Manage who belongs to an organization: list members, add an
# existing user to the org (admin-only).

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User ,OrganizationMember,Project

org_bp = Blueprint('organizations', __name__)

@org_bp.route('/organizations/<int:organization_id>/members', methods=['GET'])
@jwt_required()
def list_members(organization_id):
    current_user_id = int(get_jwt_identity())
    requester_membership = OrganizationMember.query.filter_by(
        organization_id=organization_id, user_id=current_user_id
    ).first()
    if not requester_membership:
        return jsonify({'error':'You do not have access to this organization'}), 403

    members = OrganizationMember.query.filter_by(
        organization_id=organization_id
    ).all()
    return jsonify([m.to_dict() for m in members]),200

@org_bp.route('/organizations/<int:organization_id>/members', methods=['POST'])
@jwt_required()
def add_member(organization_id):
    current_user_id = int(get_jwt_identity())
    requester_membership = OrganizationMember.query.filter_by(
        organization_id=organization_id, user_id = current_user_id
    ).first()
    if not requester_membership or requester_membership.role != 'admin':
        return jsonify({'error':'Only admins can add members'}), 403

    data = request.get_json(silent = True)
    if not data:
        return jsonify({'error':'JSON body is required'}), 400

    email = data.get('email','').strip().lower()
    if not email:
        return jsonify({'error':'Email is required'}), 400

    role = data.get('role','member')
    if role not in ('admin','member'):
        return jsonify({'error':'Role must be admin or member'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error':'No account exists with that email'}), 404

    existing = OrganizationMember.query.filter_by(
        organization_id=organization_id, user_id = user.id
    ).first()
    if existing:
        return jsonify({'error':'User is already a member of this organization'}), 409

    try:
        membership = OrganizationMember(
            organization_id=organization_id, user_id=user.id, role=role
        )
        db.session.add(membership)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify(membership.to_dict()), 201

@org_bp.route('/organizations/<int:organization_id>/members/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(organization_id, user_id):
    current_user_id = int(get_jwt_identity())
    requester_membership = OrganizationMember.query.filter_by(
        organization_id=organization_id, user_id=current_user_id
    ).first()
    if not requester_membership or requester_membership.role!= 'admin':
        return jsonify({'error':'Only admins can remove members'}), 403

    membership = OrganizationMember.query.filter_by(
        organization_id=organization_id, user_id=user_id
    ).first_or_404()

    if membership.role =='admin':
        admin_count = OrganizationMember.query.filter_by(
            organization_id=organization_id, role='admin'
        ).count()
        if admin_count <= 1:
            return jsonify({'error':'Cannot remove the only admin from an organization'}), 400

    owned_projects = Project.query.filter_by(
            organization_id = organization_id, owner_id = user_id
        ).count()
    if owned_projects >0:
        return jsonify({
            'error':'Cannot remove a member who owns projects. Transfer or delete their projects first.'
        }), 400
    
    try:
        db.session.delete(membership)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({'message':'Member removed'}), 200