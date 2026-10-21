import re
import threading
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .. import fonts
from ..auth import get_current_user
from ..models import Account

router = APIRouter(prefix='/fonts', tags=['fonts'])
_requests = defaultdict(deque)
_rate_lock = threading.Lock()


class FontRequest(BaseModel):
    family: str = Field(min_length=1, max_length=100)


@router.get('')
def library():
    return fonts.list_fonts()


@router.post('')
def retrieve_font(body: FontRequest, user: Account = Depends(get_current_user)):
    try:
        key = fonts.family_key(body.family)
        if not (fonts.CACHE_DIR / key / 'font.css').is_file():
            # Rate-limit cache misses only; normal profile views never consume quota.
            with _rate_lock:
                now = time.monotonic()
                for account_id in list(_requests):
                    while _requests[account_id] and _requests[account_id][0] < now - 60:
                        _requests[account_id].popleft()
                    if not _requests[account_id]:
                        del _requests[account_id]
                attempts = _requests[str(user.id)]
                if len(attempts) >= 5:
                    raise HTTPException(429, 'Please wait before requesting more fonts.')
                attempts.append(now)
            key = fonts.ensure_font(body.family)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except fonts.FontUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    return {'family': fonts.normalize_family(body.family), 'stylesheet': f'/fonts/{key}/font.css'}


@router.get('/{key}/{filename}')
def font_asset(key: str, filename: str):
    if not re.fullmatch(r'[a-f0-9]{64}', key) or not (
        filename == 'font.css' or re.fullmatch(r'[a-f0-9]{64}\.woff2', filename)
    ):
        raise HTTPException(404, 'Font not found')
    path = fonts.CACHE_DIR / key / filename
    if not path.is_file():
        raise HTTPException(404, 'Font not cached')
    return FileResponse(path, media_type='text/css' if filename == 'font.css' else 'font/woff2',
                        headers={'Cache-Control': 'public, max-age=31536000, immutable'})
