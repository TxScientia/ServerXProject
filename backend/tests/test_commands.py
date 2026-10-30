from backend.app.commands import (
    MALFORMED,
    NOT_COMMAND,
    OK,
    interpret,
)


def doc(text):
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


# --- pure engine ---------------------------------------------------------------

def test_dice_single_german():
    status, body = interpret("/wurf20", "Arthas")
    assert status == OK
    assert body["kind"] == "dice"
    assert body["text"].startswith("🎲 Arthas würfelte eine ")
    assert "(W20)" in body["text"]


def test_dice_single_english_alias():
    status, body = interpret("/roll 20", "Arthas")
    assert status == OK
    assert "rolled a" in body["text"]
    assert "(d20)" in body["text"]


def test_dice_multi_shows_sum():
    status, body = interpret("/wurf 2w6", "Arthas")
    assert status == OK
    assert "(2W6)" in body["text"]
    assert " = " in body["text"]


def test_bare_wurf_defaults_to_d6():
    status, body = interpret("/wurf", "Arthas")
    assert status == OK
    assert "(W6)" in body["text"]


def test_dice_malformed_is_dropped():
    for bad in ["/wurf0", "/wurf1", "/wurf abc", "/wurf 99w6", "/wurf 2w9999"]:
        status, body = interpret(bad, "Arthas")
        assert status == MALFORMED, bad
        assert body is None


def test_not_a_command_passes_through():
    status, body = interpret("Hallo zusammen", "Arthas")
    assert status == NOT_COMMAND
    # Words/strings that merely start with the letters are not commands (no separator).
    assert interpret("/wurfen wir los", "Arthas")[0] == NOT_COMMAND
    assert interpret("/wurfabc", "Arthas")[0] == NOT_COMMAND


def test_conch_answers_and_echoes_question():
    status, body = interpret('/mc "Soll ich heute Brötchen essen?"', "Arthas")
    assert status == OK
    assert body["kind"] == "conch"
    assert "magische Miesmuschel" in body["text"]
    assert "Soll ich heute Brötchen essen?" in body["text"]  # quotes stripped, question kept


def test_conch_english_alias():
    status, body = interpret("/conch Will it rain?", "Arthas")
    assert status == OK
    assert "Magic Conch" in body["text"]
    assert "Will it rain?" in body["text"]


def test_conch_without_question_is_dropped():
    assert interpret("/mc", "Arthas")[0] == MALFORMED
    assert interpret("/mc    ", "Arthas")[0] == MALFORMED


# --- OOC endpoint integration --------------------------------------------------

def test_ooc_dice_command_creates_roll_message(client, auth_headers, character):
    headers = {**auth_headers, "X-Character-Id": str(character.id)}
    resp = client.post("/ooc/messages", headers=headers, json={"body": doc("/wurf20")})
    assert resp.status_code == 200
    created = resp.json()
    assert created["kind"] == "roll"
    assert created["body"]["kind"] == "dice"
    assert "Testchar" in created["body"]["text"]


def test_ooc_malformed_command_is_silently_dropped(client, auth_headers, character):
    headers = {**auth_headers, "X-Character-Id": str(character.id)}
    resp = client.post("/ooc/messages", headers=headers, json={"body": doc("/wurf0")})
    assert resp.status_code == 204

    # Nothing was stored.
    listing = client.get("/ooc/messages", headers=auth_headers).json()
    assert all(m["kind"] != "roll" for m in listing)
    assert not any("/wurf0" in str(m.get("body")) for m in listing)


def test_ooc_normal_message_still_works(client, auth_headers, character):
    headers = {**auth_headers, "X-Character-Id": str(character.id)}
    resp = client.post("/ooc/messages", headers=headers, json={"body": doc("Just chatting")})
    assert resp.status_code == 200
    assert resp.json()["kind"] is None
