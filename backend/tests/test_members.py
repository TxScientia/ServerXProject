from backend.app.crud import create_rank, create_storybook


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
