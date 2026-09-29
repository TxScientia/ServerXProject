"""Application-level encryption for message content at rest.

Messages (and system-message text) are encrypted with AES-256-GCM before they are
written to the database, and decrypted when read. This protects the *content* against
anyone who can read the database itself — a leaked dump, a stolen backup, a curious
DBA — regardless of the DB engine (works identically on SQLite and Postgres).

This is NOT end-to-end encryption: the server holds the key and decrypts messages in
order to serve them, compute unread badges, and allow moderation. Combine with TLS in
transit and provider disk-encryption at rest for defense in depth.

The key is a 32-byte value provided base64-encoded via MESSAGE_ENCRYPTION_KEY. Generate
one with:  python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"
"""
import base64
import json
import os
import warnings

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_STR_PREFIX = "enc:v1:"  # marks an encrypted string column value
_ENVELOPE_MARKER = "__enc__"  # marks an encrypted JSON column value

# Deterministic dev fallback key so the app runs without configuration in development.
# It is insecure — a warning is emitted and it must be overridden in prod.
_DEV_KEY = base64.b64encode(b"serverx-dev-insecure-key".ljust(32, b"0")).decode()


def _load_key() -> bytes:
    raw = os.getenv("MESSAGE_ENCRYPTION_KEY")
    if not raw:
        warnings.warn(
            "MESSAGE_ENCRYPTION_KEY is not set; using an insecure development key. "
            "Set MESSAGE_ENCRYPTION_KEY (base64-encoded 32 bytes) in production.",
            stacklevel=2,
        )
        raw = _DEV_KEY
    try:
        key = base64.b64decode(raw)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("MESSAGE_ENCRYPTION_KEY must be valid base64") from exc
    if len(key) != 32:
        raise RuntimeError("MESSAGE_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)")
    return key


# Loaded once at import; AESGCM instances are cheap and thread-safe for encrypt/decrypt.
_aesgcm = AESGCM(_load_key())


def _seal(plaintext: bytes) -> tuple[str, str]:
    """Return (base64 nonce, base64 ciphertext) for the given plaintext."""
    nonce = os.urandom(12)
    ct = _aesgcm.encrypt(nonce, plaintext, None)
    return base64.b64encode(nonce).decode(), base64.b64encode(ct).decode()


def _open(nonce_b64: str, ct_b64: str) -> bytes:
    nonce = base64.b64decode(nonce_b64)
    ct = base64.b64decode(ct_b64)
    return _aesgcm.decrypt(nonce, ct, None)


# --- JSON columns (e.g. Tiptap message body) ------------------------------------

def encrypt_json(value) -> dict:
    """Encrypt a JSON-serializable value into an envelope dict for a JSON column."""
    plaintext = json.dumps(value, separators=(",", ":")).encode("utf-8")
    nonce_b64, ct_b64 = _seal(plaintext)
    return {_ENVELOPE_MARKER: 1, "n": nonce_b64, "ct": ct_b64}


def is_encrypted_json(value) -> bool:
    return isinstance(value, dict) and value.get(_ENVELOPE_MARKER) == 1


def decrypt_json(value):
    """Decrypt an envelope dict back to its original value.

    Plaintext (non-envelope) values are returned unchanged, so pre-existing rows and
    tests that store raw JSON keep working.
    """
    if not is_encrypted_json(value):
        return value
    plaintext = _open(value["n"], value["ct"])
    return json.loads(plaintext.decode("utf-8"))


# --- String columns (e.g. system-message content) -------------------------------

def encrypt_str(text: str) -> str:
    """Encrypt a string into a self-describing 'enc:v1:<nonce>:<ct>' token."""
    nonce_b64, ct_b64 = _seal(text.encode("utf-8"))
    return f"{_STR_PREFIX}{nonce_b64}:{ct_b64}"


def is_encrypted_str(value) -> bool:
    return isinstance(value, str) and value.startswith(_STR_PREFIX)


def decrypt_str(value: str) -> str:
    """Decrypt an 'enc:v1:...' token; return plaintext values unchanged."""
    if not is_encrypted_str(value):
        return value
    _, _, rest = value.partition(_STR_PREFIX)
    nonce_b64, _, ct_b64 = rest.partition(":")
    return _open(nonce_b64, ct_b64).decode("utf-8")
