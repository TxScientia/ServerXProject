import uuid

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.types import CHAR, String, TypeDecorator

from . import crypto


class GUID(TypeDecorator):
    """Platform-independent UUID type.

    Uses PostgreSQL's native UUID type when available and stores UUIDs as
    32-character hex strings on SQLite/other databases.
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(str(value)).hex
        return value.hex

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


class EncryptedJSON(TypeDecorator):
    """A JSON column whose value is transparently AES-GCM encrypted at rest.

    In application code the value is always the plaintext object (e.g. Tiptap JSON);
    it is encrypted into an envelope dict on write and decrypted on read, so no route
    or CRUD code has to know about encryption. Uses JSONB on PostgreSQL, JSON elsewhere.
    Pre-existing plaintext rows are returned unchanged (see crypto.decrypt_json).
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return crypto.encrypt_json(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return crypto.decrypt_json(value)


class EncryptedString(TypeDecorator):
    """A text column transparently AES-GCM encrypted at rest.

    Plaintext in application code; 'enc:v1:...' token in the database. Pre-existing
    plaintext rows are returned unchanged (see crypto.decrypt_str).
    """

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return crypto.encrypt_str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return crypto.decrypt_str(value)
