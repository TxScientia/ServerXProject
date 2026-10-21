import json
import os
import time
import threading
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import images
from ..auth import get_current_user
from ..database import get_db
from ..models import Account, ImageAsset

router = APIRouter(prefix='/images', tags=['images'])
_upload_slots = threading.BoundedSemaphore(2)


def check_rate(account_id):
    # Disk-backed and locked across workers; invalid-file attempts consume quota too.
    with images.storage_lock():
        path = images.IMAGE_DIR / '.rate.json'
        now = time.time()
        limits = json.loads(path.read_text()) if path.exists() else {}
        limits = {key: [stamp for stamp in stamps if stamp > now - 60]
                  for key, stamps in limits.items()}
        limits = {key: stamps for key, stamps in limits.items() if stamps}
        attempts = limits.setdefault(str(account_id), [])
        if len(attempts) >= images.UPLOADS_PER_MINUTE:
            raise HTTPException(429, 'Zu viele Uploads. Bitte eine Minute warten.', headers={'Retry-After': '60'})
        attempts.append(now)
        temporary = images.IMAGE_DIR / '.rate.tmp'
        temporary.write_text(json.dumps(limits))
        os.replace(temporary, path)


def save_image(raw: bytes, account_id, db: Session, replace_id: uuid.UUID | None = None):
    with images.storage_lock():
        previous = db.get(ImageAsset, replace_id) if replace_id else None
        if replace_id and previous is None:
            raise HTTPException(409, 'Das bisherige Bild existiert nicht mehr. Bitte das Feld leeren und erneut hochladen.')
        if previous is not None and previous.account_id != account_id:
            raise HTTPException(403, 'Dieses Bild gehört einem anderen Account.')
        replaced_bytes = previous.size_bytes if previous is not None else 0
        total = db.query(func.coalesce(func.sum(ImageAsset.size_bytes), 0)).scalar()
        owned = db.query(func.coalesce(func.sum(ImageAsset.size_bytes), 0)).filter(
            ImageAsset.account_id == account_id).scalar()
        # Replacement consumes only the net size difference, even at full quota.
        owned -= replaced_bytes
        total -= replaced_bytes
        try:
            optimized, width, height = images.optimize_image(raw)
        except images.InvalidImage as exc:
            raise HTTPException(422, str(exc)) from exc
        if owned + len(optimized) > images.ACCOUNT_QUOTA_BYTES or total + len(optimized) > images.TOTAL_QUOTA_BYTES:
            raise HTTPException(413, 'Bildspeicher voll. Bitte den Administrator kontaktieren.')
        image_id = uuid.uuid4()
        asset = ImageAsset(id=image_id, account_id=account_id, size_bytes=len(optimized), width=width, height=height)
        path = images.image_file(image_id.hex)
        temporary = path.with_suffix('.tmp')
        try:
            with temporary.open('xb') as output:
                output.write(optimized)
            os.replace(temporary, path)
            db.add(asset)
            if previous is not None:
                db.delete(previous)
            db.commit()
        except Exception:
            db.rollback()
            path.unlink(missing_ok=True)
            raise
        finally:
            temporary.unlink(missing_ok=True)
        if replace_id is not None:
            # Only destroy the old image after validation and successful persistence.
            # No trash folder, version history or backup copy is created.
            images.image_file(replace_id.hex).unlink(missing_ok=True)
        return {'id': image_id.hex, 'url': f'/api/images/{image_id.hex}.webp',
                'width': width, 'height': height, 'size_bytes': len(optimized)}


@router.post('', status_code=201)
async def upload_image(request: Request, replace: uuid.UUID | None = Query(None),
                       user: Account = Depends(get_current_user), db: Session = Depends(get_db)):
    # Raw binary avoids multipart parsers spooling unbounded request bodies to disk.
    length = request.headers.get('content-length')
    if length:
        try:
            size = int(length)
        except ValueError:
            raise HTTPException(400, 'Invalid Content-Length')
        if size < 0 or size > images.MAX_UPLOAD_BYTES:
            raise HTTPException(413, 'Maximale Dateigröße: 10 MiB.')
    # Bound buffered requests per process as well as serialized image decoding.
    if not _upload_slots.acquire(blocking=False):
        raise HTTPException(503, 'Upload-Dienst ausgelastet. Bitte erneut versuchen.', headers={'Retry-After': '5'})
    try:
        await run_in_threadpool(check_rate, user.id)
        raw = bytearray()
        async for chunk in request.stream():
            if len(raw) + len(chunk) > images.MAX_UPLOAD_BYTES:
                raise HTTPException(413, 'Maximale Dateigröße: 10 MiB.')
            raw.extend(chunk)
        return await run_in_threadpool(save_image, bytes(raw), user.id, db, replace)
    finally:
        _upload_slots.release()


@router.get('')
def list_images(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
                user: Account = Depends(get_current_user), db: Session = Depends(get_db)):
    assets = db.query(ImageAsset).filter(ImageAsset.account_id == user.id).order_by(
        ImageAsset.created_at.desc(), ImageAsset.id).offset(offset).limit(limit).all()
    return [{'id': asset.id.hex, 'url': f'/api/images/{asset.id.hex}.webp',
             'width': asset.width, 'height': asset.height, 'size_bytes': asset.size_bytes,
             'created_at': asset.created_at} for asset in assets]


@router.get('/{image_id}.webp')
def get_image(image_id: str, db: Session = Depends(get_db)):
    try:
        path = images.image_file(image_id)
    except ValueError:
        raise HTTPException(404, 'Bild nicht gefunden')
    if not path.is_file() or db.get(ImageAsset, uuid.UUID(hex=image_id)) is None:
        raise HTTPException(404, 'Bild nicht gefunden')
    # Do not retain browser/proxy copies of replaced or deleted user images.
    return FileResponse(path, media_type='image/webp', headers={
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Referrer-Policy': 'no-referrer',
        'Content-Disposition': f'inline; filename="{image_id}.webp"',
    })


@router.delete('/{image_id}', status_code=204)
def delete_image(image_id: uuid.UUID, user: Account = Depends(get_current_user), db: Session = Depends(get_db)):
    with images.storage_lock():
        asset = db.get(ImageAsset, image_id)
        if asset is None:
            raise HTTPException(404, 'Bild nicht gefunden')
        if asset.account_id != user.id:
            raise HTTPException(403, 'Dieses Bild gehört einem anderen Account.')
        images.image_file(image_id.hex).unlink(missing_ok=True)
        db.delete(asset)
        db.commit()
    return Response(status_code=204)
