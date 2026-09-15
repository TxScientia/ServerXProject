from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..crud import list_all_characters
from ..database import get_db
from ..models import Account

router = APIRouter()


@router.get("/residents")
def list_residents(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All characters (the resident list). Owner/account is intentionally not exposed."""
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "race": c.race,
            "spec": c.specification,
            "gender": c.gender,
        }
        for c in list_all_characters(db)
    ]
