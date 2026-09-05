from models import db, Issue, IssueActivity, Project

def create_issue(project_id, user_id, data):
    project = Project.query.filter_by(id=project_id).with_for_update().first()

    project.issue_counter = (project.issue_counter or 0)+1
    issue_key = f'{project.key}-{project.issue_counter}'

    issue = Issue(
        issue_key = issue_key,
        title = data['title'],
        description = data['description'],
        steps_to_reproduce = data.get('steps_to_reproduce'),
        issue_type = data.get('issue_type') or 'bug',
        priority = data.get('priority') or 'no_priority',
        severity = data.get('severity') or 'low',
        category = data.get('category') or 'general',
        project_id = project_id,
        reporter_id = user_id,
        assignee_id= data.get('assignee_id')
    )

    db.session.add(issue)
    db.session.flush()# gives issue.id before we commit

    db.session.add(IssueActivity(
        issue_id= issue.id, user_id = user_id, action='created'
    ))

    db.session.commit()
    return issue

def change_status(issue, user_id, new_status):
    old = issue.status
    if old == new_status:
        return issue

    issue.status = new_status
    db.session.add(IssueActivity(
        issue_id = issue.id, user_id = user_id,
        action='status_changed', old_value= old,new_value=new_status,
    ))

    db.session.commit()
    return issue

def change_assignee(issue, user_id, new_assignee_id):
    old = issue.assignee_id
    if old == new_assignee_id:
        return issue

    issue.assignee_id = new_assignee_id
    db.session.add(IssueActivity(
        issue_id = issue.id, user_id = user_id,
        action='assigned' if new_assignee_id else 'unassigned',
        old_value=str(old) if old else None,
        new_value = str(new_assignee_id) if new_assignee_id else None,
    ))

    db.session.commit()
    return issue

    
