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
    with TestClient(app) as test_client:
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
