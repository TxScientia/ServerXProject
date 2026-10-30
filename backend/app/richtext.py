"""Shared rich-text (Tiptap JSON) validation.

Every stored rich-text body — RP posts, plot news, wanted ads, PMs — must match
this whitelist. We store Tiptap's JSON document, never HTML, so the only formatting
that can ever exist is bold / italic / underline / strike / colour text inside
paragraphs and bulleted/numbered lists. Headings, links, images, code — and therefore any HTML tag or
script — are impossible to express, so nothing dangerous can be stored.

Custom smileys (:shortcode:) stay plain text and are swapped for an image only at
render time, so they pass this validator unchanged.
"""
import re

from fastapi import HTTPException

ALLOWED_NODE_TYPES = {"doc", "paragraph", "text", "hardBreak", "bulletList", "orderedList", "listItem"}
ALLOWED_MARK_TYPES = {"bold", "italic", "underline", "strike", "textStyle"}
_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


def validate_rich_text(body, *, max_chars: int, label: str = "Nachricht") -> None:
    """Validate a Tiptap JSON doc against the shared whitelist.

    Raises HTTP 422 if the body isn't a whitelisted, non-empty doc within max_chars.
    `label` names the content in the empty/too-long messages (e.g. "Nachricht").
    """
    if not isinstance(body, dict) or body.get("type") != "doc":
        raise HTTPException(status_code=422, detail="Ungültiger Inhalt")

    total_chars = 0

    def walk(node):
        nonlocal total_chars
        if not isinstance(node, dict) or node.get("type") not in ALLOWED_NODE_TYPES:
            raise HTTPException(status_code=422, detail="Nicht erlaubter Inhaltstyp")
        for mark in node.get("marks") or []:
            mtype = mark.get("type") if isinstance(mark, dict) else None
            if mtype not in ALLOWED_MARK_TYPES:
                raise HTTPException(status_code=422, detail="Nicht erlaubte Formatierung")
            if mtype == "textStyle":
                color = (mark.get("attrs") or {}).get("color")
                if color is not None and not _HEX_COLOR.match(str(color)):
                    raise HTTPException(status_code=422, detail="Ungültige Farbe")
        text = node.get("text")
        if isinstance(text, str):
            total_chars += len(text)
        for child in node.get("content") or []:
            walk(child)

    walk(body)
    if total_chars == 0:
        raise HTTPException(status_code=422, detail=f"{label} darf nicht leer sein")
    if total_chars > max_chars:
        raise HTTPException(status_code=422, detail=f"{label} ist zu lang")
