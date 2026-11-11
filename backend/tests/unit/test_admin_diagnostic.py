import httpx

from app.diagnose_admin import online_check


def test_diagnostic_uses_cookie_and_csrf_then_logs_out_with_rotated_csrf():
    paths = []
    old, new = 'a' * 64, 'b' * 64

    def server(request):
        paths.append(request.url.path)
        if request.url.path == '/api/csrf':
            token = new if 'session=live' in request.headers.get('cookie', '') else old
            return httpx.Response(200, json={'token': token}, headers={'set-cookie': 'csrf=nonce; Path=/'})
        if request.url.path == '/api/auth/login':
            assert request.headers['x-csrf-token'] == old
            assert 'csrf=nonce' in request.headers['cookie']
            return httpx.Response(200, json={}, headers={'set-cookie': 'session=live; Path=/'})
        if request.url.path == '/api/admin/me':
            return httpx.Response(403, json={'code': 'FORBIDDEN'})
        assert request.url.path == '/api/auth/logout'
        assert request.headers['x-csrf-token'] == new
        return httpx.Response(204)

    with httpx.Client(base_url='https://test.example', transport=httpx.MockTransport(server)) as client:
        assert online_check(client, 'admin@example.test', 'private') == 'LOGIN_OK ADMIN_HTTP_403 LOGOUT_OK'
    assert paths == ['/api/csrf', '/api/auth/login', '/api/admin/me', '/api/csrf', '/api/auth/logout']


def test_diagnostic_reports_invalid_credentials_without_exposing_response_secrets():
    def server(request):
        if request.url.path == '/api/csrf':
            return httpx.Response(200, json={'token': 'a' * 64})
        return httpx.Response(401, json={'code': 'INVALID_CREDENTIALS', 'secret': 'do not print'})

    with httpx.Client(base_url='https://test.example', transport=httpx.MockTransport(server)) as client:
        assert online_check(client, 'admin@example.test', 'private') == 'LOGIN_HTTP_401 INVALID_CREDENTIALS'


def test_diagnostic_never_posts_password_after_a_redirected_csrf_request():
    def server(request):
        assert request.method == 'GET'
        return httpx.Response(307, headers={'location': 'https://unrelated.example'})

    with httpx.Client(base_url='https://test.example', transport=httpx.MockTransport(server)) as client:
        assert online_check(client, 'admin@example.test', 'private') == 'CSRF_HTTP_307'
