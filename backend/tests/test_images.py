import io
import json

import pytest
from PIL import Image, PngImagePlugin

from backend.app import images
from backend.app.crud import create_account
from backend.app.models import ImageAsset, Space
from backend.app.routes.characters import character_to_response
from backend.app.schemas.character import CharacterCreate
from backend.app.schemas.place import PlaceCreate, PlaceUpdate
from backend.app.schemas.space import StorybookUpdate


def png(size=(24, 16)):
    output = io.BytesIO()
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text('Comment', 'private metadata')
    Image.new('RGBA', size, (255, 0, 0, 100)).save(output, format='PNG', pnginfo=metadata)
    return output.getvalue()


def test_upload_optimized_served_and_owned(client, auth_headers, account, db_session):
    raw = png((3000, 1500)) + b'<script>trailing-payload</script>'
    response = client.post('/images', content=raw, headers=auth_headers)
    assert response.status_code == 201
    result = response.json()
    assert (result['width'], result['height']) == (2048, 1024)
    asset = db_session.query(ImageAsset).one()
    assert asset.account_id == account.id
    served = client.get(result['url'])
    assert served.status_code == 200
    assert served.headers['content-type'] == 'image/webp'
    assert served.headers['x-content-type-options'] == 'nosniff'
    assert b'trailing-payload' not in served.content
    assert b'private metadata' not in served.content
    with Image.open(io.BytesIO(served.content)) as output:
        assert output.format == 'WEBP'
        assert output.mode == 'RGBA'
        assert not output.getexif()
        assert 'icc_profile' not in output.info
    assert client.get('/images', headers=auth_headers).json()[0]['url'] == result['url']
    assert not list(images.IMAGE_DIR.glob('*.tmp'))


def test_replacement_permanently_removes_old_image(client, auth_headers, uploaded_image, db_session):
    previous = db_session.query(ImageAsset).one()
    previous_id = previous.id.hex
    response = client.post(f'/images?replace={previous_id}', content=png(), headers=auth_headers)
    assert response.status_code == 201
    replacement = response.json()
    assert replacement['url'] != uploaded_image
    assert client.get(uploaded_image).status_code == 404
    assert not images.image_file(previous_id).exists()
    assert client.get(replacement['url']).status_code == 200
    assert db_session.query(ImageAsset).count() == 1
    assert len(list(images.IMAGE_DIR.glob('*.webp'))) == 1
    assert not list(images.IMAGE_DIR.glob('*.tmp'))
    assert client.get(replacement['url']).headers['cache-control'] == 'no-store'


def test_invalid_replacement_preserves_old_image(client, auth_headers, uploaded_image, db_session):
    previous = db_session.query(ImageAsset).one()
    old_bytes = images.image_file(previous.id.hex).read_bytes()
    response = client.post(f'/images?replace={previous.id.hex}', content=b'not an image', headers=auth_headers)
    assert response.status_code == 422
    assert client.get(uploaded_image).content == old_bytes
    assert db_session.query(ImageAsset).count() == 1
    assert len(list(images.IMAGE_DIR.glob('*.webp'))) == 1


def test_replacement_credit_at_full_quota(client, auth_headers, uploaded_image, db_session, monkeypatch):
    previous = db_session.query(ImageAsset).one()
    monkeypatch.setattr(images, 'ACCOUNT_QUOTA_BYTES', previous.size_bytes)
    monkeypatch.setattr(images, 'TOTAL_QUOTA_BYTES', previous.size_bytes)
    # Use exactly the same encoded size to test a full-quota replacement.
    encoded = images.image_file(previous.id.hex).read_bytes()
    monkeypatch.setattr(images, 'optimize_image', lambda _: (encoded, 16, 16))
    response = client.post(f'/images?replace={previous.id.hex}', content=png(), headers=auth_headers)
    assert response.status_code == 201
    assert not images.image_file(previous.id.hex).exists()
    assert db_session.query(ImageAsset).count() == 1


def test_replacement_cannot_delete_another_accounts_image(client, auth_headers, uploaded_image, db_session):
    asset = db_session.query(ImageAsset).one()
    other = create_account(db_session, 'different@example.com', 'different', 'secret')
    asset.account_id = other.id
    db_session.commit()
    response = client.post(f'/images?replace={asset.id.hex}', content=png(), headers=auth_headers)
    assert response.status_code == 403
    assert client.get(uploaded_image).status_code == 200
    assert db_session.query(ImageAsset).count() == 1


def test_stale_replacement_does_not_create_extra_image(client, auth_headers):
    response = client.post('/images?replace=' + 'a' * 32, content=png(), headers=auth_headers)
    assert response.status_code == 409
    assert not list(images.IMAGE_DIR.glob('*.webp'))


def test_failed_persistence_preserves_previous_file(client, auth_headers, uploaded_image, db_session, account, monkeypatch):
    from backend.app.routes.images import save_image
    previous = db_session.query(ImageAsset).one()
    previous_id = previous.id.hex
    old_bytes = images.image_file(previous_id).read_bytes()
    def fail():
        raise RuntimeError('Database unavailable')
    monkeypatch.setattr(db_session, 'commit', fail)
    with pytest.raises(RuntimeError, match='Database unavailable'):
        save_image(png(), account.id, db_session, previous.id)
    assert images.image_file(previous_id).read_bytes() == old_bytes
    assert db_session.query(ImageAsset).count() == 1
    assert len(list(images.IMAGE_DIR.glob('*.webp'))) == 1


def test_authentication_required(client):
    assert client.post('/images', content=png()).status_code == 422
    assert client.get('/images').status_code == 422
    assert client.post('/images', content=png(), headers={'Authorization': 'Bearer no'}).status_code == 401


@pytest.mark.parametrize('raw', [b'', b'<svg onload="alert(1)"></svg>', b'<html>bad</html>', b'GIF89a', b'not a jpeg', png()[:40]])
def test_unsafe_or_broken_files_rejected(client, auth_headers, db_session, raw):
    response = client.post('/images', content=raw, headers={**auth_headers, 'Content-Type': 'image/png'})
    assert response.status_code == 422
    assert db_session.query(ImageAsset).count() == 0
    assert not list(images.IMAGE_DIR.glob('*.webp'))


def test_content_type_and_name_never_trusted(client, auth_headers):
    response = client.post('/images', content=b'<script>alert(1)</script>', headers={
        **auth_headers, 'Content-Type': 'image/jpeg', 'X-Filename': '../../evil.jpg'})
    assert response.status_code == 422


def test_oversize_stream_rejected(client, auth_headers, monkeypatch):
    monkeypatch.setattr(images, 'MAX_UPLOAD_BYTES', 32)
    assert client.post('/images', content=b'x' * 33, headers=auth_headers).status_code == 413
    assert client.post('/images', content=iter([b'x' * 16, b'y' * 17]), headers=auth_headers).status_code == 413


def test_pixel_limit_before_decode(client, auth_headers, monkeypatch):
    monkeypatch.setattr(images, 'MAX_PIXELS', 100)
    assert client.post('/images', content=png(), headers=auth_headers).status_code == 422


def test_animated_webp_rejected(client, auth_headers):
    output = io.BytesIO()
    Image.new('RGB', (20, 20), 'red').save(output, format='WEBP', save_all=True,
        append_images=[Image.new('RGB', (20, 20), 'blue')], duration=100, loop=0)
    assert client.post('/images', content=output.getvalue(), headers=auth_headers).status_code == 422


def test_exif_orientation_and_metadata_removed():
    source = Image.new('RGB', (40, 20))
    exif = Image.Exif()
    exif[274] = 6
    exif[270] = 'private description'
    output = io.BytesIO()
    source.save(output, format='JPEG', exif=exif)
    encoded, width, height = images.optimize_image(output.getvalue())
    assert (width, height) == (20, 40)
    assert b'private description' not in encoded
    assert not Image.open(io.BytesIO(encoded)).getexif()


def test_quotas_and_rate_limit(client, auth_headers, monkeypatch):
    monkeypatch.setattr(images, 'ACCOUNT_QUOTA_BYTES', 1)
    assert client.post('/images', content=png(), headers=auth_headers).status_code == 413
    monkeypatch.setattr(images, 'ACCOUNT_QUOTA_BYTES', 200 * 1024 * 1024)
    monkeypatch.setattr(images, 'TOTAL_QUOTA_BYTES', 1)
    assert client.post('/images', content=png(), headers=auth_headers).status_code == 413
    monkeypatch.setattr(images, 'UPLOADS_PER_MINUTE', 2)
    assert client.post('/images', content=b'bad', headers=auth_headers).status_code == 429


def test_concurrent_uploads_are_bounded(client, auth_headers, monkeypatch):
    import threading
    from backend.app.routes import images as image_routes
    monkeypatch.setattr(image_routes, '_upload_slots', threading.BoundedSemaphore(0))
    assert client.post('/images', content=png(), headers=auth_headers).status_code == 503


def test_invalid_attempts_count_toward_rate(client, auth_headers, monkeypatch):
    monkeypatch.setattr(images, 'UPLOADS_PER_MINUTE', 1)
    assert client.post('/images', content=b'bad', headers=auth_headers).status_code == 422
    assert client.post('/images', content=b'bad', headers=auth_headers).status_code == 429


def test_unknown_image_files_return_404_without_spa_routes():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from backend.app.routes.images import router

    api_only = FastAPI()
    api_only.include_router(router, prefix='/api')
    with TestClient(api_only) as api_client:
        for path in ('.rate.json', 'secret.txt', 'nested/private.json'):
            response = api_client.get(f'/api/images/{path}')
            assert response.status_code == 404
            assert response.json() == {'detail': 'Bild nicht gefunden'}


def test_owner_delete_and_no_filesystem_traversal(client, auth_headers, uploaded_image, db_session):
    asset = db_session.query(ImageAsset).one()
    other = create_account(db_session, 'other@example.com', 'other', 'secret')
    # Simulate a different owner without bypassing authentication.
    asset.account_id = other.id
    db_session.commit()
    assert client.delete(f'/images/{asset.id.hex}', headers=auth_headers).status_code == 403
    assert client.get(uploaded_image).status_code == 200
    assert client.get('/images/not-an-id.webp').status_code == 404
    assert client.get('/images/.rate.json').status_code == 404
    from backend.app.crud import get_account_by_login_name
    asset.account_id = get_account_by_login_name(db_session, 'player').id
    db_session.commit()
    assert client.delete(f'/images/{asset.id.hex}', headers=auth_headers).status_code == 204
    assert client.get(uploaded_image).status_code == 404
    assert db_session.query(ImageAsset).count() == 0


@pytest.mark.parametrize('url', ['https://tracker.example/a.png', '//tracker.example/a.png',
    'data:image/svg+xml,bad', 'javascript:alert(1)', '/pictures/../evil.png', '/api/images/' + 'a' * 32 + '.webp'])
def test_external_or_unknown_references_rejected(url):
    for schema in (PlaceCreate, PlaceUpdate, StorybookUpdate):
        with pytest.raises(ValueError):
            schema(title='Title', image_url=url)
    for data in ({'portraitImageUrl': url}, {'characterTabContent': [{'type': 'image', 'url': url}]},
                 {'abilitiesTabContent': [{'type': 'textImageText', 'imageUrl': url}]}):
        with pytest.raises(ValueError):
            CharacterCreate(name='Name', race='', spec='', gender='', editorData=data)


def test_character_references_and_legacy_filter(client, auth_headers, character, db_session, uploaded_image):
    data = {'portraitImageUrl': uploaded_image, 'characterTabContent': [{'type': 'image', 'url': uploaded_image}]}
    response = client.put(f'/characters/{character.id}', headers=auth_headers,
        json={'name': 'Name', 'race': '', 'spec': '', 'gender': '', 'editorData': data})
    assert response.status_code == 200
    assert response.json()['editorData'] == data
    character.editor_data = json.dumps({'portraitImageUrl': 'https://tracker.example/a.png',
        'abilitiesTabContent': [{'type': 'textImageText', 'imageUrl': '//tracker.example/a.png', 'text': 'safe text'}]})
    db_session.commit()
    safe = character_to_response(character)['editorData']
    assert safe['portraitImageUrl'] == ''
    assert safe['abilitiesTabContent'][0]['imageUrl'] == ''
    assert safe['abilitiesTabContent'][0]['text'] == 'safe text'


def test_storybook_and_place_references(client, auth_headers, character, db_session, uploaded_image):
    headers = {**auth_headers, 'X-Character-Id': str(character.id)}
    storybook = client.post('/storybooks', json={'title': 'World'}, headers=headers).json()
    endpoint = f'/storybooks/{storybook["id"]}'
    assert client.patch(endpoint, json={'image_url': 'https://tracker.example/x'}, headers=headers).status_code == 422
    assert client.patch(endpoint, json={'image_url': uploaded_image}, headers=headers).json()['image_url'] == uploaded_image
    assert client.post(endpoint + '/places', json={'title': 'Place', 'image_url': 'https://tracker.example/x'}, headers=headers).status_code == 422
    place = client.post(endpoint + '/places', json={'title': 'Place', 'image_url': uploaded_image}, headers=headers)
    assert place.status_code == 200
    assert place.json()['image_url'] == uploaded_image
    space = db_session.query(Space).one()
    space.image_url = 'https://tracker.example/legacy.png'
    db_session.commit()
    assert client.get(endpoint, headers=auth_headers).json()['image_url'] is None
