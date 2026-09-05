from flask_jwt_extended import get_jwt_identity
from models import OrganizationMember

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