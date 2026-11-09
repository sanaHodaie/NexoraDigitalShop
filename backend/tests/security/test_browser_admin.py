"""One management surface: cookie sessions and CSRF, no native-session bypass."""
from conftest import write

from app.setup_local_admin import save


def test_retired_app_routes_and_bearer_cannot_create_admin_access(client, engine):
    assert client.get('/api/health').json() == {'status': 'ok'}
    assert client.get('/api/mobile/health').status_code == 404
    assert client.get('/api/mobile/session').status_code == 404
    save(engine, 'manager@example.test', 'manager-password-12345')
    assert write(client, 'POST', '/api/auth/login', json={
        'email': 'manager@example.test', 'password': 'manager-password-12345',
    }).status_code == 200
    assert client.get('/api/admin/me').status_code == 200
    headers = {'Authorization': 'Bearer invalid-native-token'}
    assert client.post('/api/admin/newsletter-notifications/read', headers=headers, json={'throughId': 0}).status_code == 400
    client.cookies.clear()
    assert client.get('/api/admin/me', headers=headers).status_code == 401
