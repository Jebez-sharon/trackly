from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import db, Issue, Project
from routes.utils import current_user_id, get_membership, is_member
from services.issue_service import create_issue, change_status, change_assignee

issue_bp = Blueprint('issues',__name__, url_prefix='/api/projects')
issue_detail_bp = Blueprint('issue_detail',__name__,url_prefix='/api/issues')

VALID_PRIORITIES = {'no_priority','low','medium','high','urgent'}
VALID_SEVERITIES = {'low','medium','high','critical'}
VALID_STATUSES = {'new','in-progress','ready-for-test','closed'}

def _project_if_allowed(project_id):
    project = db.session.get(Project, project_id)
    if project is None:
        return None, (jsonify({'error':'Project not found'}), 404)
    if get_membership(project.organization_id) is None:
        return None, (jsonify({'error':'You are not a member of this organization'}), 403)
    return project, None

@issue_bp.route('/<int:project_id>/issues', methods=['GET'])
@jwt_required()
def list_issues(project_id):
    project, error = _project_if_allowed(project_id)
    if error:
        return error

    issues = Issue.query.filter_by(
        project_id=project.id
    ).order_by(Issue.id).all()
    return jsonify([i.to_dict() for i in issues]),200

@issue_bp.route('/<int:project_id>/issues', methods=['POST'])
@jwt_required()
def add_issues(project_id):
    project, error = _project_if_allowed(project_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}

    title = data.get('title').strip() if isinstance(data.get('title'), str) else ''
    description = data.get('description').strip() if isinstance(data.get('description'), str) else ''

    if not title or not description:
        return jsonify({'error':'title and description are required'}),400

    priority = data.get('priority') or 'no_priority'
    if priority not in VALID_PRIORITIES:
        return jsonify({'error':f'priority must be one of {sorted(VALID_PRIORITIES)}'}),400

    severity = data.get('severity') or 'low'
    if severity not in VALID_SEVERITIES:
        return jsonify({'error':f'severity must be one of {sorted(VALID_SEVERITIES)}'}),400

    issue = create_issue(project.id, current_user_id(),{
        **data,
        'title':title,
        'description':description,
        'priority':priority,
        'severity':severity
    })

    return jsonify(issue.to_dict()),201

def _issue_if_allowed(issue_id):
    issue = db.session.get(Issue, issue_id)
    if issue is None:
        return None, (jsonify({'error':'Issue not found'}), 404)

    if get_membership(issue.project.organization_id) is None:
        return None, (jsonify({'error':'You are not a member of this organization'}), 403)
    return issue, None

@issue_detail_bp.route('/<int:issue_id>',methods=['GET'])
@jwt_required()
def get_issue(issue_id):
    issue, error = _issue_if_allowed(issue_id)
    if error:
        return error
    return jsonify(issue.to_dict_detailed()),200

@issue_detail_bp.route('/<int:issue_id>',methods=['PATCH'])
@jwt_required()
def update_issue(issue_id):
    issue,error = _issue_if_allowed(issue_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    user_id = current_user_id()

    if 'status' in data:
        status = data['status']
        if status not in VALID_STATUSES:
            return jsonify({
                'error':f'status must be one of {sorted(VALID_STATUSES)}'
                }),400
        change_status(issue, user_id, status)

    if 'assignee_id' in data:
        assignee_id = data['assignee_id']
        if assignee_id is not None:
            if not isinstance(assignee_id, int):
                return jsonify({
                    'error':'assignee_id must be a number or null'
                }),400
            if not is_member(issue.project.organization_id, assignee_id):
                return jsonify({
                    'error':'That user is not in this organization'
                }),400

        change_assignee(issue, user_id, assignee_id)

    return jsonify(issue.to_dict_detailed()),200
    