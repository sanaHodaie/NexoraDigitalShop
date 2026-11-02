"""Use the inherited proxy/CA without weakening TLS verification."""
import os
import ssl

from aiogram.client.session.aiohttp import AiohttpSession


def telegram_session(proxy_url=""):
    session = AiohttpSession(proxy=proxy_url or os.getenv("HTTPS_PROXY") or os.getenv("https_proxy"))
    # aiogram's certifi-only context otherwise ignores the managed environment CA.
    # Keep its existing roots, then add the configured CA bundle to this session.
    bundle = os.getenv("SSL_CERT_FILE") or os.getenv("REQUESTS_CA_BUNDLE")
    if bundle:
        context = ssl.create_default_context()
        context.load_verify_locations(cafile=bundle)
        session._connector_init["ssl"] = context
    return session
