from backend.app.crud import create_character, create_rank, create_storybook
from backend.app.models import Membership


def test_members_include_assigned_rank(client, db_session, auth_headers, character):
    space = create_storybook(db_session, character, "Plot", "Desc")
    manager = create_rank(db_session, space.id, "Manager", 1)
    cashier = create_rank(db_session, space.id, "Cashier", 5)
    headers = {**auth_headers, "X-Character-Id": str(character.id)}

    response = client.patch(
        f"/storybooks/{space.id}/members/{character.id}/rank",
        headers=headers,
        json={"rank_id": str(cashier.id)},
    )
    assert response.status_code == 200

    members = client.get(f"/storybooks/{space.id}/members", headers=headers)
    assert members.status_code == 200
    data = members.json()
    assert data[0]["rank_id"] == str(cashier.id)
    assert data[0]["rank_name"] == "Cashier"
    assert data[0]["rank_weight"] == 5

    response = client.patch(
        f"/storybooks/{space.id}/members/{character.id}/rank",
        headers=headers,
        json={"rank_id": str(manager.id)},
    )
    assert response.status_code == 200
    assert client.get(f"/storybooks/{space.id}/members", headers=headers).json()[0]["rank_name"] == "Manager"


def test_member_rank_can_be_cleared(client, db_session, auth_headers, character):
    space = create_storybook(db_session, character, "Plot", "Desc")
    rank = create_rank(db_session, space.id, "Manager", 1)
    headers = {**auth_headers, "X-Character-Id": str(character.id)}

    assert client.patch(
        f"/storybooks/{space.id}/members/{character.id}/rank",
        headers=headers,
        json={"rank_id": str(rank.id)},
    ).status_code == 200
    assert client.patch(
        f"/storybooks/{space.id}/members/{character.id}/rank",
        headers=headers,
        json={"rank_id": None},
    ).status_code == 200

    member = client.get(f"/storybooks/{space.id}/members", headers=headers).json()[0]
    assert member["rank_id"] is None
    assert member["rank_name"] is None
    assert member["rank_weight"] is None


def test_invited_character_appears_as_pending(client, db_session, auth_headers, account, character):
    space = create_storybook(db_session, character, "Plot", "Desc")
    headers = {**auth_headers, "X-Character-Id": str(character.id)}
    target = create_character(db_session, account.id, "Target", "Elf", "Ranger", "Divers")

    resp = client.post(
        f"/storybooks/{space.id}/invites/characters",
        headers=headers,
        json={"character_id": str(target.id), "space_id": str(space.id)},
    )
    assert resp.status_code == 200

    members = client.get(f"/storybooks/{space.id}/members", headers=headers).json()
    pending = [m for m in members if m["status"] == "pending"]
    assert len(pending) == 1
    assert pending[0]["character_id"] == str(target.id)
    # The creator is still listed as accepted.
    assert any(m["role"] == "creator" and m["status"] == "accepted" for m in members)


def test_set_member_role_to_editor(client, db_session, auth_headers, account, character):
    space = create_storybook(db_session, character, "Plot", "Desc")
    headers = {**auth_headers, "X-Character-Id": str(character.id)}
    member = create_character(db_session, account.id, "Member", "Elf", "Ranger", "Divers")
    db_session.add(Membership(space_id=space.id, character_id=member.id, role="member"))
    db_session.commit()

    resp = client.patch(
        f"/storybooks/{space.id}/members/{member.id}/role",
        headers=headers,
        json={"role": "editor"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "editor"

    members = client.get(f"/storybooks/{space.id}/members", headers=headers).json()
    row = [m for m in members if m["character_id"] == str(member.id)][0]
    assert row["role"] == "editor"


def test_cannot_reassign_creator_role(client, db_session, auth_headers, character):
    space = create_storybook(db_session, character, "Plot", "Desc")
    headers = {**auth_headers, "X-Character-Id": str(character.id)}
    resp = client.patch(
        f"/storybooks/{space.id}/members/{character.id}/role",
        headers=headers,
        json={"role": "editor"},
    )
    assert resp.status_code == 404
