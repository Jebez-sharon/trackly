# services/issue_service.py — inside backend/services/
# Business logic for creating an Issue safely, as one atomic
# transaction. Routes call into this instead of touching the
# database directly.

from models import db, Project, OrganizationMember, Issue, IssueActivity

ALLOWED_ISSUE_FIELDS={
    'steps_to_reproduce', 'issue_type','priority',
    'severity','category','status','assignee_id'
}

def create_issue(project_id, reporter_id, title,  description, **kwargs):
    # Confirms the reporter belongs to the same org that owns
    # this project — the actual multi-tenant security check.
    project = Project.query.filter_by(id=project_id).first()
    if not project:
        raise ValueError('Project not found')

    membership = OrganizationMember.query.filter_by(
        organization_id=project.organization_id, user_id=reporter_id
    ).first()
    if not membership:
        raise PermissionError('You do not have access to this project')

    assignee_id = kwargs.get('assignee_id')
    if assignee_id is not None:
        assignee_membership = OrganizationMember.query.filter_by(
            organization_id = project.organization_id, user_id=assignee_id
        ).first()
        if not assignee_membership:
            raise PermissionError('Assignee is not a member of this organization')

    # with_for_update() locks this specific project row until the transaction commits. If two requests hit this at the same moment, the second one waits — preventing both from reading the same counter value and generating a duplicate issue_key.
    try:
        project = (
            Project.query.filter_by(id=project_id
                ).with_for_update().first()
            )
        if not project:
            raise ValueError('Project not found')
        project.issue_counter += 1
        issue_key = f"{project.key}-{project.issue_counter}"

        safe_kwargs={
            key: value for key, value in kwargs.items()
            if key in ALLOWED_ISSUE_FIELDS
        }

        issue = Issue(
            issue_key=issue_key,
            title= title,
            description=description,
            project_id= project_id,
            reporter_id=reporter_id,
            **safe_kwargs
    )

        db.session.add(issue)
        db.session.flush()

        activity = IssueActivity(
            issue_id = issue.id,
            user_id = reporter_id,
            action = 'created',
            new_value=issue_key
        )
        db.session.add(activity)
# Everything above — counter increment, Issue, IssueActivity —
    # commits together here, or none of it does if anything failed.
        db.session.commit()
        return issue
    except Exception:
        db.session.rollback()
        raise
