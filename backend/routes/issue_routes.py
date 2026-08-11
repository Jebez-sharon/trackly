# HTTP layer for issues. Parses requests, checks auth, calls the
# service, and returns JSON — no business logic lives here.

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Issue, Project, OrganizationMember
from services.issue_service import create_issue

issue_bp = Blueprint('issues', __name__)

@issue_bp.route('/projects/<int:project_id>/issues', methods=['GET'])
@jwt_required()
def list_issues(project_id):
    # Confirms the requester belongs to this project's org before
    # returning anything — same multi-tenant check as create_issue.
    current_user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)

    membership = OrganizationMember.query.filter_by(
        organization_id=project.organization_id, user_id= current_user_id
    ).first()
    if not membership:
        return jsonify({'error':'You do not have access to this project'}), 403

    issues = Issue.query.filter_by(project_id=project_id).order_by(
        Issue.created_at.desc()
    ).all()
    return jsonify([issue.to_dict() for issue in issues]), 200

@issue_bp.route('/projects/<int:project_id>/issues', methods=['POST'])
@jwt_required()
def create_issue_route(project_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error':'JSON body is required'}),400

    title = data.get('title')
    description = data.get('description')
    if not title or not description:
        return jsonify({
            'error':'Title and description are required'
        }),400

    optional_fields = {
        k: v for k , v in data.items()
        if k not in('title', 'description')
    }

    try:
        issue = create_issue(
            project_id=project_id,
            reporter_id=current_user_id,
            title=title,
            description=description,
            **optional_fields
        )
        return jsonify(issue.to_dict()), 201
    except ValueError as e:
        return jsonify({'error':str(e)}), 404
    except PermissionError as e:
        return jsonify({
            'error':str(e)
        }),403