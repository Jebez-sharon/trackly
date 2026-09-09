"""Validation and lifecycle for projects, issues and comments."""

import pytest

from models import Comment, Issue, IssueActivity, Project, db


def test_project_key_rules(client, owner):
    org = owner.org_id

    def create(name, key):
        return client.post(
            f"/api/organizations/{org}/projects",
            json={"name": name, "key": key},
            headers=owner.headers,
        )

    assert create("Website", "WEB").status_code == 201
    assert create("Duplicate", "WEB").status_code == 409
    assert create("Spaces", "A B").status_code == 400
    assert create("Punctuation", "A-B").status_code == 400
    assert create("Too long", "ABCDEFGHIJK").status_code == 400
    assert create("Nameless", "").status_code == 400

    # Lower case is accepted and stored upper case.
    assert create("Mobile", "mob").get_json()["key"] == "MOB"


def test_issue_keys_increment_per_project(client, owner, project):
    other = client.post(
        f"/api/organizations/{owner.org_id}/projects",
        json={"name": "API", "key": "API"},
        headers=owner.headers,
    ).get_json()

    def file_issue(project_id, title):
        return client.post(
            f"/api/projects/{project_id}/issues",
            json={"title": title, "description": "..."},
            headers=owner.headers,
        ).get_json()["issue_key"]

    assert file_issue(project["id"], "one") == "WEB-1"
    assert file_issue(project["id"], "two") == "WEB-2"
    # A separate project starts its own sequence rather than continuing.
    assert file_issue(other["id"], "three") == "API-1"
    assert file_issue(project["id"], "four") == "WEB-3"


def test_creating_an_issue_requires_a_title_and_description(client, owner, project):
    for body in ({"title": "only a title"}, {"description": "only a description"}, {}):
        response = client.post(
            f"/api/projects/{project['id']}/issues", json=body, headers=owner.headers
        )
        assert response.status_code == 400, body


@pytest.mark.parametrize(
    "field,value",
    [
        ("priority", "urgentish"),
        ("severity", "catastrophic"),
        ("issue_type", "chore"),
    ],
)
def test_creating_an_issue_rejects_unknown_enum_values(
    client, owner, project, field, value
):
    response = client.post(
        f"/api/projects/{project['id']}/issues",
        json={"title": "t", "description": "d", field: value},
        headers=owner.headers,
    )
    assert response.status_code == 400


def test_an_oversized_title_is_a_400_on_create_and_on_edit(client, owner, project, issue):
    """Issue.title is String(150). Unchecked, the value reached the database and
    came back as an unhandled 500."""
    created = client.post(
        f"/api/projects/{project['id']}/issues",
        json={"title": "z" * 200, "description": "d"},
        headers=owner.headers,
    )
    assert created.status_code == 400

    edited = client.patch(
        f"/api/issues/{issue['id']}", json={"title": "z" * 200}, headers=owner.headers
    )
    assert edited.status_code == 400


def test_patch_needs_at_least_one_known_field(client, owner, issue):
    for body in ({}, {"nonsense": 1}):
        response = client.patch(
            f"/api/issues/{issue['id']}", json=body, headers=owner.headers
        )
        assert response.status_code == 400, body


def test_patch_rejects_a_blank_title_or_description(client, owner, issue):
    for body in ({"title": "   "}, {"description": ""}):
        response = client.patch(
            f"/api/issues/{issue['id']}", json=body, headers=owner.headers
        )
        assert response.status_code == 400, body


def test_a_rejected_field_leaves_nothing_half_applied(client, owner, issue):
    """Validation runs over the whole body before anything is written."""
    before = client.get(f"/api/issues/{issue['id']}", headers=owner.headers).get_json()

    response = client.patch(
        f"/api/issues/{issue['id']}",
        json={"title": "A perfectly good new title", "priority": "nonsense"},
        headers=owner.headers,
    )
    assert response.status_code == 400

    after = client.get(f"/api/issues/{issue['id']}", headers=owner.headers).get_json()
    assert after["title"] == before["title"]


def test_editing_records_which_fields_moved(client, owner, issue):
    client.patch(
        f"/api/issues/{issue['id']}",
        json={"title": "A clearer title", "priority": "high"},
        headers=owner.headers,
    )
    edit = IssueActivity.query.filter_by(issue_id=issue["id"], action="edited").one()
    assert set(edit.extra_data["fields"]) == {"title", "priority"}


def test_writing_the_same_value_records_nothing(client, owner, issue):
    client.patch(
        f"/api/issues/{issue['id']}", json={"title": issue["title"]}, headers=owner.headers
    )
    assert IssueActivity.query.filter_by(issue_id=issue["id"], action="edited").count() == 0


def test_status_and_assignment_are_recorded(client, owner, member, issue):
    client.patch(
        f"/api/issues/{issue['id']}", json={"status": "closed"}, headers=owner.headers
    )
    client.patch(
        f"/api/issues/{issue['id']}",
        json={"assignee_id": member.user_id},
        headers=owner.headers,
    )
    actions = [
        a.action
        for a in IssueActivity.query.filter_by(issue_id=issue["id"])
        .order_by(IssueActivity.id)
        .all()
    ]
    assert actions == ["created", "status_changed", "assigned"]


def test_a_comment_needs_a_message(client, owner, issue):
    for body in ({"message": "   "}, {}):
        response = client.post(
            f"/api/issues/{issue['id']}/comments", json=body, headers=owner.headers
        )
        assert response.status_code == 400, body


def test_deleting_an_issue_takes_its_comments_and_activity(client, owner, issue):
    client.post(
        f"/api/issues/{issue['id']}/comments",
        json={"message": "a comment"},
        headers=owner.headers,
    )
    assert Comment.query.filter_by(issue_id=issue["id"]).count() == 1

    response = client.delete(f"/api/issues/{issue['id']}", headers=owner.headers)
    assert response.status_code == 204

    assert db.session.get(Issue, issue["id"]) is None
    assert Comment.query.filter_by(issue_id=issue["id"]).count() == 0
    assert IssueActivity.query.filter_by(issue_id=issue["id"]).count() == 0


def test_deleting_a_project_takes_its_issues(client, owner, project, issue):
    assert Issue.query.filter_by(project_id=project["id"]).count() == 1

    response = client.delete(f"/api/projects/{project['id']}", headers=owner.headers)
    assert response.status_code == 204

    assert db.session.get(Project, project["id"]) is None
    assert Issue.query.filter_by(project_id=project["id"]).count() == 0


def test_a_json_list_body_is_a_400_on_every_write(client, owner, project, issue):
    """Same guard as the auth routes: a list body must not become a 500."""
    writes = [
        ("post", f"/api/organizations/{owner.org_id}/projects"),
        ("post", f"/api/projects/{project['id']}/issues"),
        ("patch", f"/api/issues/{issue['id']}"),
        ("post", f"/api/issues/{issue['id']}/comments"),
        ("post", f"/api/organizations/{owner.org_id}/members"),
    ]
    for method, path in writes:
        response = getattr(client, method)(
            path, json=["not", "a", "dict"], headers=owner.headers
        )
        assert response.status_code == 400, f"{method} {path} -> {response.status_code}"
        assert response.is_json, path


def test_unknown_ids_are_404(client, owner):
    assert client.get("/api/issues/999999", headers=owner.headers).status_code == 404
    assert (
        client.delete("/api/projects/999999", headers=owner.headers).status_code == 404
    )
