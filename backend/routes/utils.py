from flask import jsonify,request
from flask_jwt_extended import get_jwt_identity

from models import db,Issue,OrganizationMember

def current_user_id():
    return int(get_jwt_identity())

def get_membership(org_id):
    return OrganizationMember.query.filter_by(
        organization_id = org_id, user_id = current_user_id()
    ).first()

def is_member(org_id, user_id):
    return OrganizationMember.query.filter_by(
        organization_id=org_id, user_id=user_id
    ).first() is not None

def issue_if_allowed(issue_id):
    issue = db.session.get(Issue, issue_id)
    if issue is None:
        return None, (jsonify({
            'error':'Issue not found'
        }),404)

    if get_membership(issue.project.organization_id) is None:
        return None, (jsonify({
            'error':'You are not a member of this organization'
        }),403)
    return issue , None

def require_admin(org_id):
    membership = get_membership(org_id)
    if membership is None:
        return jsonify({
            'error':'You are not a member of this organization'
        }),403
    if membership.role != 'admin':
        return jsonify({'error':'Only admins can do this'}),403
    return None

def json_body():
    """Always returns a dict.

    request.get_json() returns whatever valid JSON was sent — including a
    list or a number. `or {}` does not catch that, because a non-empty list
    is truthy, so `data.get(...)` then raises AttributeError and Flask
    returns an unhandled 500. On /api/auth/login that is reachable with no
    credentials at all.
    """
    data= request.get_json(silent=True)
    return data if isinstance(data, dict) else {}