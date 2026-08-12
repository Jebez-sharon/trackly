# HTTP layer for issues. Parses requests, checks auth, calls the
# service, and returns JSON — no business logic lives here.

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db,Issue, Project, OrganizationMember, IssueActivity
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

@issue_bp.route('/issues/<int:issue_id>/assign', methods=['PATCH'])
@jwt_required()
def assign_issues(issue_id):
    current_user_id =int(get_jwt_identity())
    issue = Issue.query.get_or_404(issue_id)

    membership = OrganizationMember.query.filter_by(
        organization_id = issue.project.organization_id, user_id=current_user_id
    ).first()

    if not membership or membership.role != 'admin':
        return jsonify({
            'error':'Only admins can assign issues'
        }),403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error':'JSON body is required'}), 400

    assignee_id = data.get('assignee_id')
    if assignee_id is not None:
        assignee_membership = OrganizationMember.query.filter_by(
            organization_id = issue.project.organization_id, user_id=assignee_id
        ).first()
        if not assignee_membership:
            return jsonify({'error':'Assignee is not a member of this organization'}),400

    old_assignee = issue.assignee_id
    if old_assignee == assignee_id:
        return jsonify(issue.to_dict()), 200
    issue.assignee_id = assignee_id
    action = 'assigned' if assignee_id is not None else 'unassigned'

    try:
        activity = IssueActivity(
            issue_id = issue.id, user_id=current_user_id,
            action=action, old_value=str(old_assignee), new_value=str(assignee_id)
            )
        db.session.add(activity)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify(issue.to_dict()), 200

@issue_bp.route('/issues/<int:issue_id>/status', methods=['PATCH'])
@jwt_required()
def update_status(issue_id):
    current_user_id = int(get_jwt_identity())
    issue = Issue.query.get_or_404(issue_id)

    membership= OrganizationMember.query.filter_by(
        organization_id=issue.project.organization_id, user_id=current_user_id
    ).first()
    if not membership:
        return jsonify({'error':'You do not have access to this issue'}), 403

    is_admin = membership.role == 'admin'
    is_assignee = issue.assignee_id == current_user_id
    if not (is_admin or is_assignee):
        return jsonify({'error':'Only the assignee or an admin can change status'}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error':'JSON body is required'}), 400

    new_status = data.get('status')
    valid_statuses = ['new','in-progress','ready-for-test','closed']
    if new_status not in valid_statuses:
        return jsonify({'error':'Invalid status'}), 400

    old_status=issue.status
    if old_status == new_status:
        return jsonify(issue.to_dict()), 200
    
    issue.status = new_status

    try:
        activity = IssueActivity(
            issue_id = issue_id, user_id=current_user_id,
            action='status_changed',
            old_value= old_status,
            new_value= new_status
        )
        db.session.add(activity)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify(issue.to_dict()), 200