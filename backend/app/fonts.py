"""Persistent, server-only Google Fonts retrieval. No browser contacts Google."""
import hashlib
import os
import re
import shutil
import tempfile
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlencode, urlparse

import fcntl
import httpx

STARTER_FONTS = (
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway',
    'Poppins', 'Nunito', 'Inter', 'Ubuntu', 'Source Sans 3', 'Work Sans',
    'Merriweather', 'Lora', 'Playfair Display', 'Libre Baskerville',
    'Crimson Text', 'EB Garamond', 'Cormorant Garamond', 'Cinzel',
    'Cinzel Decorative', 'Bitter', 'PT Serif', 'Noto Serif', 'Noto Sans',
    'Dancing Script', 'Great Vibes', 'Pacifico', 'Sacramento', 'Satisfy',
    'Caveat', 'Amatic SC', 'Bebas Neue', 'Abril Fatface', 'Uncial Antiqua',
    'MedievalSharp',
)
CACHE_DIR = Path(os.getenv('FONT_CACHE_DIR', str(Path(os.getenv('APP_DATA_DIR', 'data')) / 'fonts')))
MAX_FAMILIES = int(os.getenv('FONT_CACHE_MAX_FAMILIES', '500'))
URL_PATTERN = re.compile(r'url\((https://fonts\.gstatic\.com/[^\s)]+)\)')


class FontUnavailable(Exception):
    pass


def normalize_family(family: str) -> str:
    family = ' '.join(family.split())
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9 -]{0,99}', family):
        raise ValueError('Use a Google Fonts family name (letters, numbers, spaces or hyphens).')
    return family


def family_key(family: str) -> str:
    return hashlib.sha256(normalize_family(family).lower().encode()).hexdigest()


@contextmanager
def cache_lock():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with (CACHE_DIR / '.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield


def download(client: httpx.Client, url: str, limit: int) -> bytes:
    with client.stream('GET', url) as response:
        if response.status_code != 200:
            raise FontUnavailable('Font provider could not supply this family.')
        data = bytearray()
        for chunk in response.iter_bytes():
            data.extend(chunk)
            if len(data) > limit:
                raise FontUnavailable('Font provider response exceeds size limit.')
        return bytes(data)


def ensure_font(family: str) -> str:
    family = normalize_family(family)
    key = family_key(family)
    with cache_lock():
        target = CACHE_DIR / key
        if (target / 'font.css').is_file():
            return key
        if sum(p.is_dir() and len(p.name) == 64 for p in CACHE_DIR.iterdir()) >= MAX_FAMILIES:
            raise FontUnavailable('Font library capacity reached. Contact an administrator.')
        staging = Path(tempfile.mkdtemp(prefix='.download-', dir=CACHE_DIR))
        try:
            # Fixed upstream hosts, no redirects, bounded responses. Never accept user URLs.
            with httpx.Client(timeout=15, follow_redirects=False, headers={
                'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                               'AppleWebKit/537.36 (KHTML, like Gecko) '
                               'Chrome/120.0.0.0 Safari/537.36'),
            }) as client:
                try:
                    css_bytes = download(client, 'https://fonts.googleapis.com/css2?' + urlencode({
                        'family': family + ':wght@400;700', 'display': 'swap',
                    }, safe=':;@'), 256_000)
                except FontUnavailable:
                    # Decorative families sometimes only provide a regular face.
                    css_bytes = download(client, 'https://fonts.googleapis.com/css2?' + urlencode({
                        'family': family, 'display': 'swap',
                    }), 256_000)
                css = css_bytes.decode('utf-8')
                urls = list(dict.fromkeys(URL_PATTERN.findall(css)))
                if not urls or len(urls) > 100:
                    raise FontUnavailable('No supported font files found.')
                for url in urls:
                    parsed = urlparse(url)
                    if parsed.hostname != 'fonts.gstatic.com' or not parsed.path.endswith('.woff2'):
                        raise FontUnavailable('Unsupported font provider response.')
                    filename = hashlib.sha256(url.encode()).hexdigest() + '.woff2'
                    blob = download(client, url, 5_000_000)
                    if not blob.startswith(b'wOF2'):
                        raise FontUnavailable('Invalid font file.')
                    (staging / filename).write_bytes(blob)
                    css = css.replace(url, filename)
                if re.search(r'https?://|@import', css):
                    raise FontUnavailable('Unexpected external resource in stylesheet.')
                (staging / 'family.txt').write_text(family, encoding='utf-8')
                (staging / 'font.css').write_text(css, encoding='utf-8')
            staging.rename(target)
        except (httpx.HTTPError, UnicodeError) as exc:
            raise FontUnavailable('Font provider temporarily unavailable.') from exc
        finally:
            if staging.exists():
                shutil.rmtree(staging)
    return key


def list_fonts():
    cached = {}
    if CACHE_DIR.exists():
        for path in CACHE_DIR.glob('*/family.txt'):
            if (path.parent / 'font.css').exists():
                name = path.read_text(encoding='utf-8')
                cached[name.lower()] = name
    names = {name.lower(): name for name in STARTER_FONTS}
    names.update(cached)
    return [{'family': name, 'cached': key in cached} for key, name in sorted(names.items())]


if __name__ == '__main__':
    # Run explicitly, not on web startup: python -m backend.app.fonts
    for family in STARTER_FONTS:
        print(f'Caching {family}...', flush=True)
        ensure_font(family)
