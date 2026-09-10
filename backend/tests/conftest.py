"""Shared fixtures.

The suite runs against an in-memory SQLite database, not the real one. That
keeps it fast and offline, at the cost of one real gap: SQLite ignores
SELECT ... FOR UPDATE, so the row lock in create_issue that stops two
concurrent requests taking the same issue key is a no-op here. These tests
prove the key sequence, not the locking.
"""

import pytest

from app import create_app
from config import Config
from models import db


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    JWT_SECRET_KEY = "testing-only-never-used-outside-the-suite"
    # pool_pre_ping and pool_recycle exist for a networked Postgres; recycling
    # a SQLite in-memory connection would throw the whole database away.
    SQLALCHEMY_ENGINE_OPTIONS = {}
    # Real hashing is deliberately slow. Every fixture user costs a register and
    # a login, so at scrypt's ~118ms a call it was most of the suite's runtime.
    # This is the only place this key is ever set.
    PASSWORD_HASH_METHOD = "pbkdf2:sha256:1"
    # Off by default: the suite registers far more than five users an hour.
    # test_rate_limits.py turns it back on for the tests that are about limits.
    RATELIMIT_ENABLED = False


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register(client, username, email, org_name, org_slug, password="password123"):
    """Registering creates the user, an organization, and an admin membership."""
    response = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "org_name": org_name,
            "org_slug": org_slug,
        },
    )
    return response


def login(client, email, password="password123"):
    response = client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    return response.get_json()["access_token"]


class Actor:
    """A registered user plus the token and ids the tests keep reaching for."""

    def __init__(self, client, username, email, org_name=None, org_slug=None):
        body = register(
            client,
            username,
            email,
            org_name or f"{username} Inc",
            org_slug or username,
        ).get_json()
        self.user_id = body["user"]["id"]
        self.username = username
        self.email = email
        self.org_id = body["organization"]["id"]
        self.token = login(client, email)
        self.headers = auth(self.token)


@pytest.fixture
def owner(client):
    """Admin and owner of org 1."""
    return Actor(client, "owner", "owner@test.local", "Acme", "acme")


@pytest.fixture
def member(client, owner):
    """A plain member of the owner's organization."""
    actor = Actor(client, "member", "member@test.local")
    client.post(
        f"/api/organizations/{owner.org_id}/members",
        json={"email": actor.email, "role": "member"},
        headers=owner.headers,
    )
    return actor


@pytest.fixture
def outsider(client):
    """Registered, but in no organization the other fixtures can see."""
    return Actor(client, "outsider", "outsider@test.local")


@pytest.fixture
def project(client, owner):
    response = client.post(
        f"/api/organizations/{owner.org_id}/projects",
        json={"name": "Website", "key": "WEB"},
        headers=owner.headers,
    )
    return response.get_json()


@pytest.fixture
def issue(client, owner, project):
    response = client.post(
        f"/api/projects/{project['id']}/issues",
        json={"title": "Login button does nothing", "description": "It never submits."},
        headers=owner.headers,
    )
    return response.get_json()
