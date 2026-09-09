from models import OrganizationMember, User

from .conftest import login, register


def test_register_creates_user_org_and_admin_membership(client, app):
    response = register(client, "ada", "ada@test.local", "Ada Inc", "ada")
    assert response.status_code == 201

    body = response.get_json()
    assert body["user"]["email"] == "ada@test.local"
    assert body["organization"]["slug"] == "ada"

    membership = OrganizationMember.query.filter_by(
        user_id=body["user"]["id"], organization_id=body["organization"]["id"]
    ).first()
    assert membership is not None
    assert membership.role == "admin"


def test_register_never_stores_the_password(client, app):
    register(client, "ada", "ada@test.local", "Ada Inc", "ada")
    user = User.query.filter_by(email="ada@test.local").first()
    assert user.password_hash != "password123"
    assert "password123" not in user.password_hash
    assert user.check_password("password123")


def test_register_lowercases_the_email(client):
    register(client, "ada", "ADA@Test.Local", "Ada Inc", "ada")
    assert User.query.filter_by(email="ada@test.local").first() is not None


def test_register_rejects_a_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={
            "username": "ada",
            "email": "ada@test.local",
            "password": "short",
            "org_name": "Ada Inc",
            "org_slug": "ada",
        },
    )
    assert response.status_code == 400


def test_register_reports_every_missing_field_at_once(client):
    response = client.post("/api/auth/register", json={"username": "ada"})
    assert response.status_code == 400
    body = response.get_json()
    assert set(body["fields"]) == {"email", "password", "org_name", "org_slug"}


def test_register_rejects_duplicates(client):
    register(client, "ada", "ada@test.local", "Ada Inc", "ada")

    same_email = register(client, "grace", "ada@test.local", "Grace Inc", "grace")
    assert same_email.status_code == 409

    same_username = register(client, "ada", "grace@test.local", "Grace Inc", "grace")
    assert same_username.status_code == 409

    same_slug = register(client, "grace", "grace@test.local", "Grace Inc", "ada")
    assert same_slug.status_code == 409


def test_login_returns_a_token_and_the_organizations(client):
    register(client, "ada", "ada@test.local", "Ada Inc", "ada")
    response = client.post(
        "/api/auth/login", json={"email": "ada@test.local", "password": "password123"}
    )
    assert response.status_code == 200

    body = response.get_json()
    assert body["access_token"]
    assert body["organizations"][0]["role"] == "admin"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_login_rejects_a_wrong_password(client):
    register(client, "ada", "ada@test.local", "Ada Inc", "ada")
    response = client.post(
        "/api/auth/login", json={"email": "ada@test.local", "password": "wrong-one"}
    )
    assert response.status_code == 401


def test_login_does_not_reveal_whether_the_email_exists(client):
    """Same status and same wording either way."""
    register(client, "ada", "ada@test.local", "Ada Inc", "ada")

    wrong_password = client.post(
        "/api/auth/login", json={"email": "ada@test.local", "password": "wrong-one"}
    )
    no_such_user = client.post(
        "/api/auth/login", json={"email": "nobody@test.local", "password": "wrong-one"}
    )

    assert wrong_password.status_code == no_such_user.status_code == 401
    assert wrong_password.get_json() == no_such_user.get_json()


def test_a_json_list_body_is_a_400_not_a_500(client):
    """json_body() exists because request.get_json() happily returns a list, and
    data.get(...) on a list is an AttributeError - an unhandled 500 reachable
    with no credentials at all."""
    for path in ("/api/auth/login", "/api/auth/register"):
        response = client.post(path, json=["not", "a", "dict"])
        assert response.status_code == 400, path
        assert response.is_json, path


def test_protected_routes_reject_a_missing_or_junk_token(client, owner, project):
    no_token = client.get(f"/api/organizations/{owner.org_id}/projects")
    assert no_token.status_code == 401

    junk = client.get(
        f"/api/organizations/{owner.org_id}/projects",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert junk.status_code == 422
