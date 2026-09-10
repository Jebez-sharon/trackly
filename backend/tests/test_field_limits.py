"""Length limits on every String(n) column reachable from user input.

SQLite does not enforce VARCHAR length, so these tests do not prove the column
refuses the value - they prove the application refuses it first, which is what
stops Postgres turning an oversized field into an unhandled 500.

Four of the six are reachable without any credentials at all.
"""

import pytest

from routes.auth_routes import MAX_LENGTHS, PASSWORD_MAX


def _payload(**overrides):
    body = {
        "username": "ada",
        "email": "ada@test.local",
        "password": "password123",
        "org_name": "Ada Inc",
        "org_slug": "ada",
    }
    body.update(overrides)
    return body


@pytest.mark.parametrize("field", sorted(MAX_LENGTHS))
def test_register_rejects_an_oversized_field(client, field):
    limit = MAX_LENGTHS[field]
    response = client.post("/api/auth/register", json=_payload(**{field: "a" * (limit + 1)}))

    assert response.status_code == 400
    body = response.get_json()
    assert field in body["fields"]
    assert body["limits"][field] == limit


@pytest.mark.parametrize("field", sorted(MAX_LENGTHS))
def test_register_accepts_a_field_exactly_at_the_limit(client, field):
    """Off-by-one guard: the boundary itself must still be allowed."""
    limit = MAX_LENGTHS[field]
    # Keep the email a valid-looking address while still hitting the limit.
    filler = "a" * (limit - len("@test.local")) + "@test.local" if field == "email" else "a" * limit

    response = client.post("/api/auth/register", json=_payload(**{field: filler}))
    assert response.status_code == 201, response.get_json()


def test_register_reports_every_oversized_field_at_once(client):
    response = client.post(
        "/api/auth/register",
        json=_payload(username="a" * 51, org_slug="b" * 51),
    )
    assert response.status_code == 400
    assert set(response.get_json()["fields"]) == {"username", "org_slug"}


def test_register_caps_password_length(client):
    """Not a column limit - a cap on how much one unauthenticated request can
    push through scrypt, which takes about 118ms per call."""
    response = client.post(
        "/api/auth/register", json=_payload(password="p" * (PASSWORD_MAX + 1))
    )
    assert response.status_code == 400

    at_limit = client.post(
        "/api/auth/register", json=_payload(password="p" * PASSWORD_MAX)
    )
    assert at_limit.status_code == 201


def test_creating_a_project_rejects_an_oversized_name(client, owner):
    response = client.post(
        f"/api/organizations/{owner.org_id}/projects",
        json={"name": "n" * 101, "key": "WEB"},
        headers=owner.headers,
    )
    assert response.status_code == 400

    at_limit = client.post(
        f"/api/organizations/{owner.org_id}/projects",
        json={"name": "n" * 100, "key": "WEB"},
        headers=owner.headers,
    )
    assert at_limit.status_code == 201


def test_no_oversized_field_reaches_the_database(client):
    """The whole point: a rejected request must not have written anything."""
    from models import Organization, User

    client.post("/api/auth/register", json=_payload(username="a" * 200))

    assert User.query.count() == 0
    assert Organization.query.count() == 0
