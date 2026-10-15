from conftest import register, write


def test_only_successful_public_catalogue_is_shared(client):
    public = client.get("/api/products", params={"category": "wearables"})
    assert public.status_code == 200
    assert public.headers["cache-control"] == "public, max-age=30"
    assert public.headers["vercel-cdn-cache-control"] == "max-age=60, stale-while-revalidate=3600"
    assert public.headers["vercel-cache-tag"] == "nexora-catalog"
    assert "set-cookie" not in public.headers

    register(client)
    signed_in = client.get("/api/products", params={"category": "wearables"})
    assert signed_in.json() == public.json()
    assert "set-cookie" not in signed_in.headers
    assert signed_in.headers["cache-control"] == public.headers["cache-control"]

    for path in ("/api/csrf", "/api/auth/me", "/api/account/cart",
                 "/api/account/wishlist", "/api/account/orders",
                 "/api/products/does-not-exist", "/api/products?limit=bad",
                 "/api/products?q=" + "x" * 101):
        response = client.get(path)
        assert response.headers["cache-control"] == "no-store", path
        assert "vercel-cdn-cache-control" not in response.headers, path

    authorized = client.get("/api/products", headers={"Authorization": "Bearer example"})
    assert authorized.headers["cache-control"] == "no-store"
    assert "vercel-cdn-cache-control" not in authorized.headers
    write_response = write(client, "POST", "/api/newsletter", json={"email": "reader@example.com"})
    assert write_response.headers["cache-control"] == "no-store"
    assert "vercel-cdn-cache-control" not in write_response.headers


def test_catalogue_server_failures_are_not_cached(client, app, monkeypatch):
    def fail(*args):
        raise RuntimeError("private database detail")

    monkeypatch.setattr(app.state.services.shopping, "products", fail)
    response = client.get("/api/products")
    assert response.status_code == 500
    assert response.headers["cache-control"] == "no-store"
    assert "vercel-cdn-cache-control" not in response.headers
    assert "private database detail" not in response.text
