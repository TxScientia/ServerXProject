"""Server-authoritative chat slash-commands: dice roller + Magic Conch oracle.

A command is recognised only at the START of a message's plain text. The result
is computed here on the server with a real RNG and stored as an immutable
``roll``-kind message, so a result can never be faked or edited by the client.

Language follows the command used, not the UI: German commands (``/wurf``,
``/mc``) produce German output, English commands (``/roll``, ``/conch``) produce
English output.

``interpret()`` returns one of three outcomes:
  * ``(NOT_COMMAND, None)``  — ordinary message, handle as usual.
  * ``(MALFORMED, None)``    — looked like a command but isn't valid; caller
                               should silently drop it (not posted, no error).
  * ``(OK, body)``           — a roll body dict ``{"kind", "text"}`` to store
                               with the message's ``kind`` set to ``"roll"``.
"""
import re
import secrets
from typing import Optional, Tuple

NOT_COMMAND = "not_command"
MALFORMED = "malformed"
OK = "ok"

MAX_DICE = 10
MAX_SIDES = 1000

# Command must sit at the very start. The lookahead stops ``/wurfen`` (a stray
# word) from being read as a dice command while still allowing ``/wurf20``.
_DICE_RE = re.compile(r"^/(?P<cmd>wurf|roll)(?=$|\s|\d)(?P<rest>.*)$", re.IGNORECASE | re.DOTALL)
_CONCH_RE = re.compile(r"^/(?P<cmd>mc|conch)(?=$|\s)(?P<rest>.*)$", re.IGNORECASE | re.DOTALL)
# Dice spec: optional "<count>w|d" then the sides. Matches "20", "2w6", "d8".
_SPEC_RE = re.compile(r"^(?:(?P<count>\d+)?[wd])?(?P<sides>\d+)$", re.IGNORECASE)

# Generic oracle answers (magic-8-ball style); short, original phrasings.
_CONCH_ANSWERS = {
    "de": [
        "Ja.",
        "Nein.",
        "Vielleicht irgendwann.",
        "Frag später nochmal.",
        "Ich glaube nicht.",
        "Nichts.",
        "Ganz bestimmt.",
        "Darauf würde ich nicht wetten.",
        "Zweifellos.",
        "Besser, du fragst nicht.",
    ],
    "en": [
        "Yes.",
        "No.",
        "Maybe someday.",
        "Try asking again.",
        "I don't think so.",
        "Nothing.",
        "Most certainly.",
        "I wouldn't count on it.",
        "Without a doubt.",
        "Better not to ask.",
    ],
}

_QUOTES = "\"'„“”‚‘’"


def plain_text(body) -> str:
    """Concatenate all text from a Tiptap JSON doc (ignores formatting)."""
    parts = []

    def walk(node):
        if not isinstance(node, dict):
            return
        text = node.get("text")
        if isinstance(text, str):
            parts.append(text)
        for child in node.get("content") or []:
            walk(child)

    walk(body)
    return "".join(parts)


def interpret(text: str, character_name: str) -> Tuple[str, Optional[dict]]:
    """Classify a message's leading text and, for valid commands, build the roll body."""
    text = (text or "").strip()
    match = _DICE_RE.match(text)
    if match:
        return _dice(match.group("rest"), match.group("cmd").lower(), character_name)
    match = _CONCH_RE.match(text)
    if match:
        return _conch(match.group("rest"), match.group("cmd").lower(), character_name)
    return (NOT_COMMAND, None)


def _dice(rest: str, cmd: str, name: str) -> Tuple[str, Optional[dict]]:
    lang = "de" if cmd == "wurf" else "en"
    spec = re.sub(r"\s+", "", rest or "")
    if spec == "":
        count, sides = 1, 6  # bare /wurf defaults to a d6
    else:
        match = _SPEC_RE.match(spec)
        if not match:
            return (MALFORMED, None)
        count = int(match.group("count")) if match.group("count") else 1
        sides = int(match.group("sides"))
    if not (1 <= count <= MAX_DICE) or not (2 <= sides <= MAX_SIDES):
        return (MALFORMED, None)

    rolls = [secrets.randbelow(sides) + 1 for _ in range(count)]
    label = f"{'' if count == 1 else count}{'W' if lang == 'de' else 'd'}{sides}"
    if count == 1:
        text = (
            f"🎲 {name} würfelte eine {rolls[0]} ({label})."
            if lang == "de"
            else f"🎲 {name} rolled a {rolls[0]} ({label})."
        )
    else:
        detail = " + ".join(str(r) for r in rolls) + f" = {sum(rolls)}"
        text = (
            f"🎲 {name} würfelte {detail} ({label})."
            if lang == "de"
            else f"🎲 {name} rolled {detail} ({label})."
        )
    return (OK, {"kind": "dice", "text": text})


def _conch(rest: str, cmd: str, name: str) -> Tuple[str, Optional[dict]]:
    lang = "de" if cmd == "mc" else "en"
    question = (rest or "").strip().strip(_QUOTES).strip()
    if not question:
        return (MALFORMED, None)

    answer = secrets.choice(_CONCH_ANSWERS[lang])
    if lang == "de":
        text = (
            f"🐚 {name} hob die magische Miesmuschel empor und fragte: "
            f"„O magische Miesmuschel … {question}“ Ein Zug an der Leine — "
            f"und die Miesmuschel antwortete: „{answer}“"
        )
    else:
        text = (
            f"🐚 {name} raised the Magic Conch and asked: "
            f"“O Magic Conch … {question}” A pull on the string — "
            f"and the Magic Conch answered: “{answer}”"
        )
    return (OK, {"kind": "conch", "text": text})
