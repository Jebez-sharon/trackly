"""Who may do what.

These are the tests worth having. A mistake in this file is a security bug,
not a layout glitch.
"""


def test_outsider_cannot_see_another_orgs_projects(client, owner, outsider, project):
    response = client.get(
        f"/api/organizations/{owner.org_id}/projects", headers=outsider.headers
    )
    assert response.status_code == 403


def test_outsider_cannot_read_an_issue(client, outsider, issue):
    response = client.get(f"/api/issues/{issue['id']}", headers=outsider.headers)
    assert response.status_code == 403


def test_outsider_cannot_comment(client, outsider, issue):
    response = client.post(
        f"/api/issues/{issue['id']}/comments",
        json={"message": "hello"},
        headers=outsider.headers,
    )
    assert response.status_code == 403


def test_member_can_read_and_comment(client, member, project, issue):
    assert (
        client.get(
            f"/api/organizations/{project['organization_id']}/projects",
            headers=member.headers,
        ).status_code
        == 200
    )
    assert client.get(f"/api/issues/{issue['id']}", headers=member.headers).status_code == 200
    assert (
        client.post(
            f"/api/issues/{issue['id']}/comments",
            json={"message": "I can reproduce this."},
            headers=member.headers,
        ).status_code
        == 201
    )


def test_member_cannot_create_a_project(client, member, owner):
    response = client.post(
        f"/api/organizations/{owner.org_id}/projects",
        json={"name": "Secret", "key": "SEC"},
        headers=member.headers,
    )
    assert response.status_code == 403


def test_member_cannot_delete_a_project_or_an_issue(client, member, project, issue):
    assert (
        client.delete(f"/api/projects/{project['id']}", headers=member.headers).status_code
        == 403
    )
    assert (
        client.delete(f"/api/issues/{issue['id']}", headers=member.headers).status_code
        == 403
    )


def test_member_cannot_manage_members(client, member, owner, outsider):
    org = owner.org_id
    assert (
        client.post(
            f"/api/organizations/{org}/members",
            json={"email": outsider.email, "role": "member"},
            headers=member.headers,
        ).status_code
        == 403
    )

    listing = client.get(
        f"/api/organizations/{org}/members", headers=owner.headers
    ).get_json()
    membership_id = next(m["id"] for m in listing if m["user"]["id"] == member.user_id)

    assert (
        client.patch(
            f"/api/organizations/{org}/members/{membership_id}",
            json={"role": "admin"},
            headers=member.headers,
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/api/organizations/{org}/members/{membership_id}", headers=member.headers
        ).status_code
        == 403
    )


def test_a_bystander_cannot_change_status_or_assignee(client, member, issue):
    """Neither admin nor assignee, so workflow changes are closed to them."""
    response = client.patch(
        f"/api/issues/{issue['id']}",
        json={"status": "closed"},
        headers=member.headers,
    )
    assert response.status_code == 403


def test_the_assignee_can_change_status(client, owner, member, issue):
    client.patch(
        f"/api/issues/{issue['id']}",
        json={"assignee_id": member.user_id},
        headers=owner.headers,
    )
    response = client.patch(
        f"/api/issues/{issue['id']}",
        json={"status": "in-progress"},
        headers=member.headers,
    )
    assert response.status_code == 200
    assert response.get_json()["status"] == "in-progress"


def test_the_reporter_can_fix_their_own_wording_but_not_move_the_issue(
    client, member, project
):
    """The split added in _may_edit_content: filing an issue lets you correct
    it, which does not imply it lets you close it."""
    filed = client.post(
        f"/api/projects/{project['id']}/issues",
        json={"title": "Typoo in the header", "description": "Spelled wrong."},
        headers=member.headers,
    ).get_json()

    fixed = client.patch(
        f"/api/issues/{filed['id']}",
        json={"title": "Typo in the header"},
        headers=member.headers,
    )
    assert fixed.status_code == 200
    assert fixed.get_json()["title"] == "Typo in the header"

    moved = client.patch(
        f"/api/issues/{filed['id']}",
        json={"status": "closed"},
        headers=member.headers,
    )
    assert moved.status_code == 403


def test_an_issue_cannot_be_assigned_outside_the_organization(
    client, owner, outsider, issue
):
    response = client.patch(
        f"/api/issues/{issue['id']}",
        json={"assignee_id": outsider.user_id},
        headers=owner.headers,
    )
    assert response.status_code == 400


def test_the_owner_cannot_be_demoted_or_removed(client, owner):
    listing = client.get(
        f"/api/organizations/{owner.org_id}/members", headers=owner.headers
    ).get_json()
    membership_id = next(m["id"] for m in listing if m["user"]["id"] == owner.user_id)

    demote = client.patch(
        f"/api/organizations/{owner.org_id}/members/{membership_id}",
        json={"role": "member"},
        headers=owner.headers,
    )
    assert demote.status_code == 400

    remove = client.delete(
        f"/api/organizations/{owner.org_id}/members/{membership_id}",
        headers=owner.headers,
    )
    assert remove.status_code == 400


def test_a_member_who_owns_projects_cannot_be_removed(client, owner, member, project):
    """Otherwise the project is left pointing at a user who is no longer here."""
    org = owner.org_id
    listing = client.get(
        f"/api/organizations/{org}/members", headers=owner.headers
    ).get_json()
    membership_id = next(m["id"] for m in listing if m["user"]["id"] == member.user_id)

    # Promote so they can own something, then hand them a project.
    client.patch(
        f"/api/organizations/{org}/members/{membership_id}",
        json={"role": "admin"},
        headers=owner.headers,
    )
    client.post(
        f"/api/organizations/{org}/projects",
        json={"name": "Theirs", "key": "THR"},
        headers=member.headers,
    )

    response = client.delete(
        f"/api/organizations/{org}/members/{membership_id}", headers=owner.headers
    )
    assert response.status_code == 409


def test_adding_a_member_requires_an_existing_account(client, owner):
    """The onboarding gap, pinned so it is a decision rather than a surprise."""
    response = client.post(
        f"/api/organizations/{owner.org_id}/members",
        json={"email": "never-registered@test.local", "role": "member"},
        headers=owner.headers,
    )
    assert response.status_code == 404


def test_a_member_cannot_be_added_twice(client, owner, member):
    response = client.post(
        f"/api/organizations/{owner.org_id}/members",
        json={"email": member.email, "role": "member"},
        headers=owner.headers,
    )
    assert response.status_code == 409
