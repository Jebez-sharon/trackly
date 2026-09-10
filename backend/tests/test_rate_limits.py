"""Rate limiting on the two unauthenticated routes.

The rest of the suite runs with RATELIMIT_ENABLED off, because it registers far
more than five users an hour. These tests build their own app with limits on.
"""

import pytest

from app import create_app
from models import db

from .conftest import TestConfig


class LimitedConfig(TestConfig):
    RATELIMIT_ENABLED = True


@pytest.fixture
def limited_client():
    app = create_app(LimitedConfig)
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()
    # init_app gives each app its own in-memory counters, so nothing leaks into
    # the next test. Relying on that would be fragile, hence a fixture per test.


def _login(client, email="nobody@test.local"):
    return client.post("/api/auth/login", json={"email": email, "password": "wrong-one"})


def _register(client, n):
    return client.post(
        "/api/auth/register",
        json={
            "username": f"user{n}",
            "email": f"user{n}@test.local",
            "password": "password123",
            "org_name": f"Org {n}",
            "org_slug": f"org{n}",
        },
    )


def test_login_allows_ten_attempts_then_refuses(limited_client):
    """Each attempt costs ~118ms of scrypt whether the account exists or not,
    so an unthrottled login is a CPU exhaustion route as well as a way to
    guess passwords."""
    codes = [_login(limited_client).status_code for _ in range(10)]
    assert codes == [401] * 10

    blocked = _login(limited_client)
    assert blocked.status_code == 429


def test_the_limit_response_is_json_and_readable(limited_client):
    for _ in range(11):
        response = _login(limited_client)

    assert response.status_code == 429
    assert response.is_json
    body = response.get_json()
    assert body["error"] == "Too many attempts. Wait a moment and try again."
    # The raw limit string must not leak into the message.
    assert "per 1 minute" not in body["error"]
    assert response.headers.get("Retry-After")


def test_registration_allows_five_then_refuses(limited_client):
    codes = [_register(limited_client, n).status_code for n in range(5)]
    assert codes == [201] * 5

    blocked = _register(limited_client, 99)
    assert blocked.status_code == 429


def test_a_refused_registration_creates_nothing(limited_client):
    from models import Organization, User

    for n in range(5):
        _register(limited_client, n)
    _register(limited_client, 99)

    assert User.query.count() == 5
    assert Organization.query.count() == 5
    assert User.query.filter_by(email="user99@test.local").first() is None


def test_limits_do_not_apply_to_the_rest_of_the_api(limited_client):
    """Only the unauthenticated routes are limited. A signed-in user reading
    their own board must not be throttled."""
    _register(limited_client, 0)
    token = limited_client.post(
        "/api/auth/login",
        json={"email": "user0@test.local", "password": "password123"},
    ).get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    codes = [
        limited_client.get("/api/organizations/1/projects", headers=headers).status_code
        for _ in range(30)
    ]
    assert set(codes) == {200}
