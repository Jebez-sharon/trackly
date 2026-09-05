from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import db,Comment
from routes.utils import current_user_id, issue_if_allowed

comment_bp = Blueprint('comments', __name__, url_prefix='/api/issues')

@comment_bp.route('/<int:issue_id>/comments', methods=['GET'])
@jwt_required()
def list_comments(issue_id):
    issue, error = issue_if_allowed(issue_id)
    if error:
        return error

    comments = Comment.query.filter_by(
        issue_id= issue.id
    ).order_by(Comment.id).all()
    return jsonify([c.to_dict() for c in comments]),200

@comment_bp.route('/<int:issue_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(issue_id):
    issue, error = issue_if_allowed(issue_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    message = data.get('message').strip() if isinstance(data.get('message') , str) else ''

    if not message:
        return jsonify({
            'error':'message is required'
        }),400

    comment = Comment(
        message = message,
        issue_id = issue.id,
        user_id = current_user_id(),
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify(comment.to_dict()), 201