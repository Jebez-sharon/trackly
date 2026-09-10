"""Paging the issue list.

The issue list was the one unbounded query in the API: every issue in a
project, however many that was.
"""

import pytest

from routes.utils import DEFAULT_PER_PAGE, MAX_PER_PAGE


@pytest.fixture
def seven_issues(client, owner, project):
    for n in range(7):
        client.post(
            f"/api/projects/{project['id']}/issues",
            json={"title": f"Issue {n}", "description": "..."},
            headers=owner.headers,
        )
    return project


def get_page(client, owner, project, query=""):
    response = client.get(
        f"/api/projects/{project['id']}/issues{query}", headers=owner.headers
    )
    assert response.status_code == 200
    return response.get_json()


def test_the_list_is_an_envelope_not_a_bare_array(client, owner, project, issue):
    body = get_page(client, owner, project)
    assert set(body) == {"items", "page", "per_page", "total", "pages"}
    assert [i["issue_key"] for i in body["items"]] == ["WEB-1"]
    assert body["total"] == 1
    assert body["pages"] == 1


def test_defaults(client, owner, project, issue):
    body = get_page(client, owner, project)
    assert body["page"] == 1
    assert body["per_page"] == DEFAULT_PER_PAGE


def test_pages_split_the_issues_without_gaps_or_repeats(
    client, owner, seven_issues
):
    first = get_page(client, owner, seven_issues, "?page=1&per_page=3")
    second = get_page(client, owner, seven_issues, "?page=2&per_page=3")
    third = get_page(client, owner, seven_issues, "?page=3&per_page=3")

    assert [i["issue_key"] for i in first["items"]] == ["WEB-1", "WEB-2", "WEB-3"]
    assert [i["issue_key"] for i in second["items"]] == ["WEB-4", "WEB-5", "WEB-6"]
    assert [i["issue_key"] for i in third["items"]] == ["WEB-7"]

    assert first["total"] == second["total"] == third["total"] == 7
    assert first["pages"] == 3

    seen = [i["id"] for page in (first, second, third) for i in page["items"]]
    assert len(seen) == len(set(seen)) == 7


def test_a_page_past_the_end_is_empty_rather_than_a_404(client, owner, seven_issues):
    body = get_page(client, owner, seven_issues, "?page=99&per_page=3")
    assert body["items"] == []
    assert body["total"] == 7


def test_per_page_is_clamped(client, owner, seven_issues):
    """A caller must not be able to ask for the whole table and undo the point
    of paginating."""
    too_big = get_page(client, owner, seven_issues, f"?per_page={MAX_PER_PAGE + 500}")
    assert too_big["per_page"] == MAX_PER_PAGE

    too_small = get_page(client, owner, seven_issues, "?per_page=0")
    assert too_small["per_page"] == 1


@pytest.mark.parametrize("query", ["?page=abc", "?page=-4", "?per_page=abc", "?page="])
def test_junk_query_values_fall_back_instead_of_erroring(
    client, owner, seven_issues, query
):
    """Someone hand-editing the address bar should see page 1, not a 400."""
    body = get_page(client, owner, seven_issues, query)
    assert body["page"] >= 1
    assert body["per_page"] >= 1


def test_paging_does_not_leak_across_projects(client, owner, seven_issues):
    other = client.post(
        f"/api/organizations/{owner.org_id}/projects",
        json={"name": "API", "key": "API"},
        headers=owner.headers,
    ).get_json()
    client.post(
        f"/api/projects/{other['id']}/issues",
        json={"title": "Only one here", "description": "..."},
        headers=owner.headers,
    )

    body = get_page(client, owner, other)
    assert body["total"] == 1
    assert [i["issue_key"] for i in body["items"]] == ["API-1"]
