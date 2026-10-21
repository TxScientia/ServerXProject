import httpx
import pytest

from backend.app import fonts


@pytest.fixture(autouse=True)
def font_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(fonts, 'CACHE_DIR', tmp_path / 'fonts')


def test_starter_library(client):
    response = client.get('/fonts')
    assert response.status_code == 200
    assert len(response.json()) == 36
    assert all(not item['cached'] for item in response.json())


def test_retrieval_requires_login(client):
    assert client.post('/fonts', json={'family': 'Cinzel'}).status_code == 422
    assert client.post('/fonts', json={'family': 'Cinzel'}, headers={'Authorization': 'Bearer invalid'}).status_code == 401


@pytest.mark.parametrize('family', ['../evil', 'https://localhost', 'Cinzel:ital@1', '";bad', ''])
def test_invalid_family(family):
    with pytest.raises(ValueError):
        fonts.ensure_font(family)


def test_download_rewrites_and_caches(monkeypatch, client):
    calls = []
    original_client = httpx.Client

    def upstream(request):
        calls.append(str(request.url))
        if request.url.host == 'fonts.googleapis.com':
            return httpx.Response(200, text="@font-face {font-family: 'Cinzel'; src: url(https://fonts.gstatic.com/s/cinzel/test.woff2) format('woff2');}")
        return httpx.Response(200, content=b'wOF2testfont')

    monkeypatch.setattr(fonts.httpx, 'Client', lambda **kwargs: original_client(
        transport=httpx.MockTransport(upstream), **kwargs))
    key = fonts.ensure_font('Cinzel')
    assert fonts.ensure_font(' cinzel ') == key
    assert len(calls) == 2
    css = client.get(f'/fonts/{key}/font.css')
    assert css.status_code == 200
    assert 'https://' not in css.text
    filename = next((fonts.CACHE_DIR / key).glob('*.woff2')).name
    asset = client.get(f'/fonts/{key}/{filename}')
    assert asset.content == b'wOF2testfont'
    assert 'immutable' in asset.headers['cache-control']
    assert next(item for item in fonts.list_fonts() if item['family'] == 'Cinzel')['cached']
    assert client.get(f'/fonts/{key}/family.txt').status_code == 404


def test_failed_download_is_not_published(monkeypatch):
    def fail(*args):
        raise fonts.FontUnavailable('offline')
    monkeypatch.setattr(fonts, 'download', fail)
    with pytest.raises(fonts.FontUnavailable):
        fonts.ensure_font('Cinzel')
    assert list(fonts.CACHE_DIR.iterdir()) == [fonts.CACHE_DIR / '.lock']


def test_authenticated_retrieval(client, auth_headers, monkeypatch):
    def cache(family):
        key = fonts.family_key(family)
        target = fonts.CACHE_DIR / key
        target.mkdir(parents=True)
        (target / 'font.css').write_text('/* cached */')
        return key
    monkeypatch.setattr(fonts, 'ensure_font', cache)
    response = client.post('/fonts', json={'family': 'Cinzel'}, headers=auth_headers)
    assert response.status_code == 200
    assert client.get(response.json()['stylesheet']).status_code == 200


def test_capacity_limit(monkeypatch):
    monkeypatch.setattr(fonts, 'MAX_FAMILIES', 0)
    with pytest.raises(fonts.FontUnavailable, match='capacity'):
        fonts.ensure_font('Cinzel')
