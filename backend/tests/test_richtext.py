import pytest
from fastapi import HTTPException

from backend.app.richtext import validate_rich_text
from backend.app.routes.ooc import _validate_body


def list_doc(kind="bulletList", text="List item"):
    return {"type": "doc", "content": [{
        "type": kind,
        "content": [{"type": "listItem", "content": [{
            "type": "paragraph", "content": [{"type": "text", "text": text, "marks": [{"type": "bold"}]}],
        }]}],
    }]}


@pytest.mark.parametrize("kind", ["bulletList", "orderedList"])
def test_lists_are_accepted(kind):
    body = list_doc(kind)
    validate_rich_text(body, max_chars=100)
    _validate_body(body)


def test_nested_lists_are_accepted():
    body = list_doc()
    body["content"][0]["content"][0]["content"].append(list_doc("orderedList")["content"][0])
    validate_rich_text(body, max_chars=100)


@pytest.mark.parametrize("text,max_chars", [("", 100), ("Too long", 3)])
def test_lists_still_enforce_text_limits(text, max_chars):
    with pytest.raises(HTTPException) as error:
        validate_rich_text(list_doc(text=text), max_chars=max_chars)
    assert error.value.status_code == 422


def test_lists_do_not_allow_unsafe_nodes():
    body = list_doc()
    body["content"][0]["content"][0]["content"].append({"type": "image", "attrs": {"src": "unsafe"}})
    with pytest.raises(HTTPException) as error:
        validate_rich_text(body, max_chars=100)
    assert error.value.status_code == 422


@pytest.mark.parametrize("kind", ["bulletList", "orderedList"])
def test_ooc_lists_round_trip(client, auth_headers, character, kind):
    body = list_doc(kind)
    headers = {**auth_headers, "X-Character-Id": str(character.id)}
    response = client.post("/ooc/messages", headers=headers, json={"body": body})
    assert response.status_code == 200
    assert response.json()["body"] == body
    listing = client.get("/ooc/messages", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()[0]["body"] == body
