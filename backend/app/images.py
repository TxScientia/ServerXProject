"""Local image storage and validation. Originals are never retained or served."""
import io
import os
import re
import warnings
from contextlib import contextmanager
from pathlib import Path

import fcntl
from PIL import Image, ImageOps, UnidentifiedImageError

IMAGE_DIR = Path(os.getenv('IMAGE_UPLOAD_DIR', str(Path(os.getenv('APP_DATA_DIR', 'data')) / 'images')))
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 25_000_000
MAX_SOURCE_EDGE = 10_000
MAX_OUTPUT_EDGE = 2048
ACCOUNT_QUOTA_BYTES = int(os.getenv('IMAGE_ACCOUNT_QUOTA_BYTES', str(200 * 1024 * 1024)))
TOTAL_QUOTA_BYTES = int(os.getenv('IMAGE_TOTAL_QUOTA_BYTES', str(5 * 1024 * 1024 * 1024)))
UPLOADS_PER_MINUTE = 10
IMAGE_PATH = re.compile(r'^/api/images/([a-f0-9]{32})\.webp$')
IMAGE_FIELDS = {'frameImageUrl', 'portraitImageUrl', 'headerBackgroundUrl', 'ornamentImageUrl', 'imageUrl'}


class InvalidImage(ValueError):
    pass


def optimize_image(raw: bytes) -> tuple[bytes, int, int]:
    """Validate actual bytes, bound decoded size, flatten metadata, encode anew."""
    if not raw or len(raw) > MAX_UPLOAD_BYTES:
        raise InvalidImage('Bild ist leer oder größer als 10 MiB.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw), formats=['JPEG', 'PNG', 'WEBP']) as probe:
                width, height = probe.size
                if width * height > MAX_PIXELS or max(width, height) > MAX_SOURCE_EDGE:
                    raise InvalidImage('Bildauflösung zu groß (max. 25 Megapixel / 10.000 px pro Seite).')
                if getattr(probe, 'is_animated', False):
                    raise InvalidImage('Animierte Bilder sind nicht erlaubt.')
                probe.verify()
            with Image.open(io.BytesIO(raw), formats=['JPEG', 'PNG', 'WEBP']) as source:
                source.load()
                oriented = ImageOps.exif_transpose(source)
                oriented.thumbnail((MAX_OUTPUT_EDGE, MAX_OUTPUT_EDGE), Image.Resampling.LANCZOS)
                # A fresh pixel buffer strips EXIF/GPS, comments, ICC/XMP and trailing payloads.
                mode = 'RGBA' if 'A' in oriented.getbands() or 'transparency' in oriented.info else 'RGB'
                pixels = oriented.convert(mode)
                clean = Image.new(mode, pixels.size)
                clean.paste(pixels)
                output = io.BytesIO()
                clean.save(output, format='WEBP', quality=82, method=4)
                return output.getvalue(), clean.width, clean.height
    except InvalidImage:
        raise
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError,
            Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise InvalidImage('Ungültiges Bild. Nur statische JPEG-, PNG- und WebP-Dateien sind erlaubt.') from exc


def image_file(image_id: str) -> Path:
    if not re.fullmatch(r'[a-f0-9]{32}', image_id):
        raise ValueError('Invalid image ID')
    return IMAGE_DIR / f'{image_id}.webp'


def local_image(value) -> str:
    """Only canonical, existing upload references; never URLs, data: or paths."""
    if not isinstance(value, str):
        return ''
    match = IMAGE_PATH.fullmatch(value)
    return value if match and image_file(match[1]).is_file() else ''


def validate_image_reference(value):
    if value is None or value == '':
        return value
    if not local_image(value):
        raise ValueError('Bitte ein Bild hochladen. Externe oder unbekannte Bild-URLs sind nicht erlaubt.')
    return value


def character_images(value, *, strict: bool):
    """Apply the same policy to top-level and nested character-builder images."""
    if isinstance(value, list):
        return [character_images(item, strict=strict) for item in value]
    if not isinstance(value, dict):
        return value
    result = {}
    for key, item in value.items():
        if key in IMAGE_FIELDS or (key == 'url' and value.get('type') == 'image'):
            result[key] = validate_image_reference(item) if strict else local_image(item)
        else:
            result[key] = character_images(item, strict=strict)
    return result


@contextmanager
def storage_lock():
    IMAGE_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (IMAGE_DIR / '.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield
