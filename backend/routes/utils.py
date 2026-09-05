from flask import jsonify
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