"""Shared pytest fixtures for the backend test suite.

Provides isolated, in-memory DB sessions and an authenticated TestClient so feature
branches can test routes without touching the real dev database.
"""
import datetime
import os
import tempfile

# Point the app at a throwaway data dir BEFORE importing it, and disable the dev
# seed, so the app never writes to the real data/app.db during tests.
os.environ.setdefault("APP_DATA_DIR", tempfile.mkdtemp(prefix="wwc-test-"))
os.environ.setdefault("WWC_SEED_TEST_DATA", "0")

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app import models  # noqa: F401 — ensure all tables are registered on Base
from backend.app.crud import create_account, create_character
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.security import SECRET_KEY


@pytest.fixture
def db_engine():
    """A fresh in-memory SQLite DB per test.

    StaticPool + a single shared connection means the ``db_session`` fixture and the
    ``client`` fixture see the same data within one test.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def TestingSessionLocal(db_engine):
    return sessionmaker(bind=db_engine, autocommit=False, autoflush=False)


@pytest.fixture
def db_session(TestingSessionLocal):
    """Direct session for model-level tests."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


class _ApiPrefixClient(TestClient):
    """TestClient that prepends the /api route prefix to bare paths.

    All API routes are mounted under /api (see app.main), but tests pass bare paths like
    "/pm/chats". This wrapper adds the prefix automatically so tests stay readable and
    don't each need updating. Root-level routes (/ping, /db-status) and already-prefixed
    paths are left untouched.
    """

    @staticmethod
    def _prefixed(url):
        if isinstance(url, str) and url.startswith("/") and not url.startswith(
            ("/api", "/ping", "/db-status")
        ):
            return "/api" + url
        return url

    def request(self, method, url, *args, **kwargs):
        return super().request(method, self._prefixed(url), *args, **kwargs)

    def websocket_connect(self, url, *args, **kwargs):
        return super().websocket_connect(self._prefixed(url), *args, **kwargs)


@pytest.fixture
def client(db_engine, TestingSessionLocal):
    """TestClient with get_db overridden to the isolated test DB.

    Ready for route tests on future feature branches.
    """

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with _ApiPrefixClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def account(db_session):
    return create_account(db_session, "player@example.com", "player", "secret")


@pytest.fixture
def character(db_session, account):
    return create_character(
        db_session, account.id, "Testchar", "Mensch", "Held", "Divers"
    )


@pytest.fixture
def auth_headers(account):
    """Bearer token for ``account``, minted the same way the login route does."""
    token = jwt.encode(
        {
            "user_id": str(account.id),
            "login_name": account.login_name,
            "exp": datetime.datetime.now(datetime.timezone.utc)
            + datetime.timedelta(hours=1),
        },
        SECRET_KEY,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}
