from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import db, Issue, Project
from routes.utils import current_user_id, get_membership, is_member, issue_if_allowed, json_body
from services.issue_service import create_issue, change_status, change_assignee


issue_bp = Blueprint('issues',__name__, url_prefix='/api/projects')
issue_detail_bp = Blueprint('issue_detail',__name__,url_prefix='/api/issues')

VALID_PRIORITIES = {'no_priority','low','medium','high','urgent'}
VALID_SEVERITIES = {'low','medium','high','critical'}
VALID_STATUSES = {'new','in-progress','ready-for-test','closed'}
VALID_ISSUE_TYPES ={'bug','feature','task'}

def _may_edit(issue):
    membership = get_membership(issue.project.organization_id)
    if membership is None:
        return False
    return membership.role == 'admin' or issue.assignee_id == current_user_id()

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

    data = json_body()

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

    issue_type = data.get('issue_type') or 'bug'
    if issue_type not in VALID_ISSUE_TYPES:
        return jsonify({
            'error':f'issue_type must be one of {sorted(VALID_ISSUE_TYPES)}'
        }),400

    category = data.get('category') if isinstance(data.get('category'), str) else 'general'
    if len(category) > 30:
        return jsonify({'error':'category must be 30 characters or fewer'}),400

    steps = data.get('steps_to_reproduce')
    if steps is not None and not isinstance(steps, str):
        return jsonify({
            'error':'steps_to_reproduce must be test or null'
        }),400

    assignee_id = data.get('assignee_id')
    if assignee_id is not None:
        if not isinstance(assignee_id, int):
            return jsonify({
                'error':'assignee_id must be a number or null'
            }),400
        if not is_member(project.organization_id, assignee_id):
            return jsonify({
                'error':'That user is not in this organization'
            }),400

    issue = create_issue(project.id, current_user_id(),{
        'title':title,
        'description':description,
        'steps_to_reproduce':steps,
        'issue_type':issue_type,
        'priority':priority,
        'severity':severity,
        'category':category,
        'assignee_id':assignee_id,
    })

    return jsonify(issue.to_dict()),201

@issue_detail_bp.route('/<int:issue_id>',methods=['GET'])
@jwt_required()
def get_issue(issue_id):
    issue, error = issue_if_allowed(issue_id)
    if error:
        return error
    return jsonify(issue.to_dict_detailed()),200

@issue_detail_bp.route('/<int:issue_id>',methods=['PATCH'])
@jwt_required()
def update_issue(issue_id):
    issue,error = issue_if_allowed(issue_id)
    if error:
        return error
    if not _may_edit(issue):
        return jsonify({
            'error':'Only an admin or the assignee can change this issue'
        }),403

    data = json_body()
    user_id = current_user_id()

    if 'status' not in data  and 'assignee_id' not in data:
        return jsonify({
            'error':'Provide status and/or assignee_id'
        }),400

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
    