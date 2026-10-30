"""Account preferences (Settings area): theme, unread-badge toggle, password change."""


def test_me_returns_default_preferences(client, auth_headers):
    me = client.get("/me", headers=auth_headers).json()
    assert me["theme"] == "light"
    assert me["show_unread_badge"] is True


def test_login_returns_preferences(client, account):
    resp = client.post("/login", json={"login_name": "player", "password": "secret"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["theme"] == "light"
    assert body["show_unread_badge"] is True


def test_update_preferences(client, auth_headers):
    resp = client.patch(
        "/me/preferences",
        headers=auth_headers,
        json={"theme": "parchment", "show_unread_badge": False},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["theme"] == "parchment"
    assert body["show_unread_badge"] is False
    # Persisted
    assert client.get("/me", headers=auth_headers).json()["theme"] == "parchment"


def test_update_preferences_partial_leaves_others(client, auth_headers):
    client.patch("/me/preferences", headers=auth_headers, json={"show_unread_badge": False})
    me = client.get("/me", headers=auth_headers).json()
    assert me["theme"] == "light"  # unchanged
    assert me["show_unread_badge"] is False


def test_light_and_dark_preferences_persist(client, auth_headers):
    for theme in ("dark", "light"):
        resp = client.patch("/me/preferences", headers=auth_headers, json={"theme": theme})
        assert resp.status_code == 200
        assert resp.json()["theme"] == theme
        assert client.get("/me", headers=auth_headers).json()["theme"] == theme


def test_update_preferences_rejects_unknown_theme(client, auth_headers):
    resp = client.patch("/me/preferences", headers=auth_headers, json={"theme": "neon"})
    assert resp.status_code == 422


def test_change_password_success(client, account, auth_headers):
    resp = client.post(
        "/me/password",
        headers=auth_headers,
        json={"current_password": "secret", "new_password": "newsecret"},
    )
    assert resp.status_code == 200
    # Old password no longer works, new one does
    assert client.post("/login", json={"login_name": "player", "password": "secret"}).status_code == 401
    assert client.post("/login", json={"login_name": "player", "password": "newsecret"}).status_code == 200


def test_change_password_wrong_current(client, account, auth_headers):
    resp = client.post(
        "/me/password",
        headers=auth_headers,
        json={"current_password": "wrong", "new_password": "newsecret"},
    )
    assert resp.status_code == 403


def test_change_password_too_short(client, account, auth_headers):
    resp = client.post(
        "/me/password",
        headers=auth_headers,
        json={"current_password": "secret", "new_password": "x"},
    )
    assert resp.status_code == 422


def test_preferences_require_auth(client):
    # Missing Authorization header is a required-header error (422) here.
    assert client.get("/me").status_code in (401, 403, 422)
    assert client.patch("/me/preferences", json={"theme": "dark"}).status_code in (401, 403, 422)
