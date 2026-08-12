# Add and list comments on an issue, scoped through the org check.
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db,Issue , Comment, OrganizationMember

comment_bp = Blueprint('comments',__name__)

@comment_bp.route('/issues/<int:issue_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(issue_id):
    current_user_id = int(get_jwt_identity())
    issue = Issue.query.get_or_404(issue_id)

    membership = OrganizationMember.query.filter_by(
        organization_id=issue.project.organization_id, user_id = current_user_id
    ).first()

    if not membership:
        return jsonify({'error':'You do not have access to this issue'}),403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error':'JSON body is required'}),400

    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error':'Message is required'}), 400

    try:
        comment = Comment(message=message, issue_id=issue_id, user_id=current_user_id)
        db.session.add(comment)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify(comment.to_dict()),201