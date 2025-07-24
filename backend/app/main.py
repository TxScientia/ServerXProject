from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, SessionLocal
from .crud import create_account, get_account_by_email

app = FastAPI()

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_test_user():
    db = SessionLocal()
    if not get_account_by_email(db, "test@example.com"):
        create_account(db, "test@example.com", "test", "1234")
    db.close()

init_test_user()

@app.get("/ping")
def ping():
    return {"message": "pong"}

@app.get("/db-status")
def db_status():
    try:
        # Test DB connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return {"db": "connected"}
    except Exception as e:
        return {"db": "error", "details": str(e)}