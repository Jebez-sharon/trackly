#Every route here is protected by JWT —
# @jwt_required()
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Bug, User

bug_bp = Blueprint('bugs', __name__)

@bug_bp.route('', methods=['GET'])
@jwt_required()
def get_bugs():
    bugs = Bug.query.order_by(Bug.created_at.desc()).all()
    return jsonify([bug.to_dict() for bug in bugs]), 200

@bug_bp.route('', methods=['POST'])
@jwt_required()
def create_bug():
    current_user_id = get_jwt_identity()

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')

    if not title or not description:
        return jsonify({'error': 'Title and description are required'}), 400

    bug = Bug(
        title= title,
        description= description,
        steps_to_reproduce= data.get('steps_to_reproduce'),
        priority = data.get('priority','no_priority'),
        category = data.get('category','general'),
        reporter_id = current_user_id
    )
    db.session.add(bug)
    db.session.commit()

    return jsonify(bug.to_dict()),201

@bug_bp.route('/<int:bug_id>', methods=['GET'])
@jwt_required()
def get_bug(bug_id):
    bug= Bug.query.get_or_404(bug_id)
    return jsonify(bug.to_dict()),200

@bug_bp.route('/<int:bug_id>', methods=['PATCH'])
@jwt_required()
def update_bug(bug_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    bug = Bug.query.get_or_404(bug_id)

    data = request.get_json()

    # Permission check matching the matrix we designed:

    is_admin = user.role == 'admin'
    is_reporter_pre_triage = (
        bug.reporter_id == current_user_id and bug.status == 'new'
    )

    if not (is_admin or is_reporter_pre_triage):
        return jsonify({'error':'You do not have permission to edit this bug'}),403

     # Only update fields that were actually sent 
    
    if 'title' in data:
        bug.title = data['title']
    if 'description' in data:
        bug.description = data['description']
    if 'steps_to_reproduce' in data:
        bug.steps_to_reproduce = data['steps_to_reproduce']
    if 'priority' in data:
        bug.priority = data['priority']
    if 'category' in data:
        bug.category = data['category']

    db.session.commit()
    return jsonify(bug.to_dict()),200

@bug_bp.route('/<int:bug_id>', methods=['DELETE'])
@jwt_required()
def delete_bug(bug_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if user.role != 'admin':
        return jsonify({'error':'Only admins can delete bugs'}), 403

    bug = Bug.query.get_or_404(bug_id)
    db.session.delete(bug)
    db.session.commit()
    return jsonify({'message':'Bug deleted'}), 200