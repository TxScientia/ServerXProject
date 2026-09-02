import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError

from .database import engine, SessionLocal, Base
from .models import Character
from .crud import (
    create_account,
    create_character,
    get_account_by_email,
    get_account_by_login_name,
)
from .routes.accounts import router as accounts_router
from .routes.characters import router as characters_router
from .routes.residents import router as residents_router
from .routes.storybooks import router as storybooks_router


def init_db():
    """Create tables, retrying while the database comes up (Postgres in Docker)."""
    for _ in range(10):
        try:
            Base.metadata.create_all(bind=engine)
            inspector = inspect(engine)
            character_columns = {column["name"] for column in inspector.get_columns("characters")}
            if "editor_data" not in character_columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE characters ADD COLUMN editor_data TEXT"))
            return
        except OperationalError:
            print("Warte auf Datenbank...")
            time.sleep(2)
    raise Exception("Datenbank nicht erreichbar!")


def init_test_user():
    db = SessionLocal()

    if not get_account_by_email(db, "test@example.com"):
        create_account(db, "test@example.com", "test", "1234")
    user = get_account_by_login_name(db, "test")
    if user:
        # Charaktere anlegen, falls noch nicht vorhanden
        if not db.query(Character).filter_by(name="Arthas", account_id=user.id).first():
            create_character(db, user.id, "Arthas", "Mensch", "Paladin", "Männlich")
        if not db.query(Character).filter_by(name="Sylvanas", account_id=user.id).first():
            create_character(db, user.id, "Sylvanas", "Untote", "Jägerin", "Weiblich")

    # These are ACCOUNTS (players), not characters — do not auto-create characters for them.
    test_accounts = ["Cana", "Jaksha", "Darling", "Luminary", "Mara", "Lordi", "Yalaria"]
    for login_name in test_accounts:
        email = f"{login_name.lower()}@example.com"
        if not get_account_by_email(db, email) and not get_account_by_login_name(db, login_name):
            create_account(db, email, login_name, login_name)

    db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Seeding is on by default for dev/deploy; tests disable it via WWC_SEED_TEST_DATA=0.
    if os.getenv("WWC_SEED_TEST_DATA", "1") == "1":
        init_test_user()
    yield


app = FastAPI(lifespan=lifespan)

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router=accounts_router)
app.include_router(router=characters_router)
app.include_router(router=residents_router)
app.include_router(router=storybooks_router)


@app.get("/ping")
def ping():
    return {"message": "pong"}


@app.get("/db-status")
def db_status():
    try:
        # Test DB connection
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return {"db": "connected"}
    except Exception as e:
        return {"db": "error", "details": str(e)}


FRONTEND_BUILD_DIR = Path(__file__).resolve().parents[2] / "frontend" / "build"
if FRONTEND_BUILD_DIR.exists():
    # Vite emits hashed bundles into build/assets (CRA used build/static).
    assets_dir = FRONTEND_BUILD_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        requested = FRONTEND_BUILD_DIR / full_path
        if full_path and requested.is_file():
            return FileResponse(requested)
        return FileResponse(FRONTEND_BUILD_DIR / "index.html")
