from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.orm import selectinload

from models import db, Issue, IssueActivity, Project
from routes.utils import current_user_id, get_membership, is_member, issue_if_allowed, json_body, require_admin
from services.issue_service import create_issue, change_status, change_assignee


issue_bp = Blueprint('issues',__name__, url_prefix='/api/projects')
issue_detail_bp = Blueprint('issue_detail',__name__,url_prefix='/api/issues')

VALID_PRIORITIES = {'no_priority','low','medium','high','urgent'}
VALID_SEVERITIES = {'low','medium','high','critical'}
VALID_STATUSES = {'new','in-progress','ready-for-test','closed'}
VALID_ISSUE_TYPES ={'bug','feature','task'}

# Issue.title is db.String(150). Without this check an oversized title reaches
# the database and comes back as an unhandled 500.
TITLE_MAX = 150

# Split by what the change means, not by which column it touches. Moving an
# issue through the workflow is a different act from correcting what it says.
WORKFLOW_FIELDS = ('status', 'assignee_id')
CONTENT_FIELDS = (
    'title', 'description', 'steps_to_reproduce',
    'issue_type', 'priority', 'severity',
)


def _may_edit(issue):
    membership = get_membership(issue.project.organization_id)
    if membership is None:
        return False
    return membership.role == 'admin' or issue.assignee_id == current_user_id()


def _may_edit_content(issue):
    # The reporter is included here but not in _may_edit: not being able to fix
    # a typo in your own bug report is the complaint this solves, and it does
    # not follow that you should also be able to reassign or close it.
    if _may_edit(issue):
        return True
    return issue.reporter_id == current_user_id()

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

    issues = Issue.query.options(
        selectinload(Issue.reporter),
        selectinload(Issue.assignee),
    ).filter_by(
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
    data = json_body()
    user_id = current_user_id()

    workflow_keys = [k for k in WORKFLOW_FIELDS if k in data]
    content_keys = [k for k in CONTENT_FIELDS if k in data]

    if not workflow_keys and not content_keys:
        return jsonify({
            'error':f'Provide at least one of {sorted(WORKFLOW_FIELDS + CONTENT_FIELDS)}'
        }),400

    if workflow_keys and not _may_edit(issue):
        return jsonify({
            'error':'Only an admin or the assignee can change status or assignee'
        }),403

    if content_keys and not _may_edit_content(issue):
        return jsonify({
            'error':'Only an admin, the assignee or the reporter can edit this issue'
        }),403

    # Validate everything before writing anything, so a bad field later in the
    # body cannot leave the issue half updated.
    title = description = steps = None

    if 'title' in data:
        title = data['title'].strip() if isinstance(data['title'], str) else ''
        if not title:
            return jsonify({'error':'title cannot be empty'}),400
        if len(title) > TITLE_MAX:
            return jsonify({
                'error':f'title must be {TITLE_MAX} characters or fewer'
            }),400

    if 'description' in data:
        description = data['description'].strip() if isinstance(data['description'], str) else ''
        if not description:
            return jsonify({'error':'description cannot be empty'}),400

    if 'steps_to_reproduce' in data:
        steps = data['steps_to_reproduce']
        if steps is not None and not isinstance(steps, str):
            return jsonify({
                'error':'steps_to_reproduce must be text or null'
            }),400
        if isinstance(steps, str):
            steps = steps.strip() or None

    for field, valid in (
        ('issue_type', VALID_ISSUE_TYPES),
        ('priority', VALID_PRIORITIES),
        ('severity', VALID_SEVERITIES),
        ('status', VALID_STATUSES),
    ):
        if field in data and data[field] not in valid:
            return jsonify({
                'error':f'{field} must be one of {sorted(valid)}'
            }),400

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

    # Content first: change_status and change_assignee commit on their own.
    incoming = {
        'title':title,
        'description':description,
        'steps_to_reproduce':steps,
        'issue_type':data.get('issue_type'),
        'priority':data.get('priority'),
        'severity':data.get('severity'),
    }
    changed = []
    for field in CONTENT_FIELDS:
        if field in data and getattr(issue, field) != incoming[field]:
            setattr(issue, field, incoming[field])
            changed.append(field)

    if changed:
        # old_value and new_value are String(100) and cannot hold a
        # description, so record which fields moved rather than a diff.
        db.session.add(IssueActivity(
            issue_id=issue.id, user_id=user_id,
            action='edited', extra_data={'fields':changed},
        ))
        db.session.commit()

    if 'status' in data:
        change_status(issue, user_id, data['status'])

    if 'assignee_id' in data:
        change_assignee(issue, user_id, data['assignee_id'])

    return jsonify(issue.to_dict_detailed()),200


@issue_detail_bp.route('/<int:issue_id>', methods=['DELETE'])
@jwt_required()
def delete_issue(issue_id):
    issue, error = issue_if_allowed(issue_id)
    if error:
        return error

    # Deliberately stricter than _may_edit. An assignee can move an issue
    # through the workflow; destroying it and its history is an admin action.
    admin_error = require_admin(issue.project.organization_id)
    if admin_error:
        return admin_error

    # activities and comments both carry cascade='all, delete-orphan'.
    db.session.delete(issue)
    db.session.commit()

    return '',204
    