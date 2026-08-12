# Create org-scoped labels, and attach/detach them on an issue.

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Label, Issue, OrganizationMember

label_bp = Blueprint('labels', __name__)

@label_bp.route('/organizations/<int:organization_id>/labels', methods=['GET'])
@jwt_required()
def list_labels(organization_id):
    current_user_id = int(get_jwt_identity())
    membership = OrganizationMember.query.filter_by(
        organization_id=organization_id, user_id= current_user_id
    ).first()
    if not membership:
        return jsonify({'error':'You do not have access to this organization'}),403

    labels = Label.query.filter_by(organization_id=organization_id).all()
    return jsonify([label.to_dict() for label in labels]), 200

@label_bp.route('/organizations/<int:organization_id>/labels', methods=['POST'])
@jwt_required()
def create_label(organization_id):
    current_user_id = int(get_jwt_identity())
    membership = OrganizationMember.query.filter_by(
        organization_id= organization_id, user_id= current_user_id
    ).first()
    if not membership:
        return jsonify({'error':'You do not have access to this organization'}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error':'JSON body is required'}), 400

    name = data.get('name','').strip().lower()
    if not name:
        return jsonify({'error':'Name is required'}),400

    existing = Label.query.filter_by(organization_id=organization_id, name =name).first()
    if existing:
        return jsonify({'error':f'Label "{name}" already exists in this organization'}),409

    try:
        label = Label(name=name, organization_id=organization_id)
        db.session.add(label)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify(label.to_dict()),201

@label_bp.route('/issues/<int:issue_id>/labels/<int:label_id>', methods=['POST'])
@jwt_required()
def add_label_to_issue(issue_id , label_id):
    current_user_id = int(get_jwt_identity())
    issue = Issue.query.get_or_404(issue_id)

    membership = OrganizationMember.query.filter_by(
        organization_id = issue.project.organization_id, user_id=current_user_id
    ).first()
    if not membership:
        return jsonify({'error':'You do not have access to this issue'}),403

    label = Label.query.get_or_404(label_id)

    if label.organization_id != issue.project.organization_id:
        return jsonify({'error':'Label does not belong to this organization'}), 400

    if label in issue.labels:
        return jsonify({'error':'Label already attached to this issue'}), 409

    try:
        issue.labels.append(label)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify(issue.to_dict()), 200

@label_bp.route('/issues/<int:issue_id>/labels/<int:label_id>', methods=['DELETE'])
@jwt_required()
def remove_label_from_issue(issue_id, label_id):
    current_user_id = int(get_jwt_identity())
    issue = Issue.query.get_or_404(issue_id)

    membership = OrganizationMember.query.filter_by(
        organization_id= issue.project.organization_id, user_id=current_user_id
    ).first()
    if not membership:
        return jsonify({'error':'You do not have access to this issue'}), 403

    label = Label.query.get_or_404(label_id)

    if label.organization_id != issue.project.organization_id:
        return jsonify({'error':'Label does not belong to this organization'}), 400

    if label not in issue.labels:
        return jsonify({'error':'Label is not attached to this issue'}), 404

    try:
        issue.labels.remove(label)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify(issue.to_dict()), 200
