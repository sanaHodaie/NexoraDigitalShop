"""Versioned JSON representation of one user's navigation, language and FSM."""
from dataclasses import asdict

from api_client import Product

PRODUCT_FIELDS = ('_products_cache', '_detail', '_compare_products')
PLAIN_FIELDS = ('_page', '_compare_mode', '_category_choices', '_selected_category')


class UserLanguageStore:
    def __init__(self, language='fa'):
        self.language = language if language in ('fa', 'en') else 'fa'

    def get_lang(self, user_id):
        return self.language

    def set_lang(self, user_id, language):
        if language in ('fa', 'en'):
            self.language = language


def restore(handler, uid, snapshot):
    if snapshot.get('version') != 1:
        return
    navigation = snapshot.get('navigation', {})
    for field in PLAIN_FIELDS:
        if field in navigation:
            getattr(handler, field)[uid] = navigation[field]
    if '_products_cache' in navigation:
        handler._products_cache[uid] = [Product(**p) for p in navigation['_products_cache']]
    if '_detail' in navigation:
        handler._detail[uid] = Product(**navigation['_detail'])
    if '_compare_products' in navigation:
        handler._compare_products[uid] = {key: Product(**p) for key, p in navigation['_compare_products'].items()}
    handler._compare[uid] = set(navigation.get('_compare', []))


def snapshot(handler, uid, language, fsm_state, fsm_data):
    navigation = {field: getattr(handler, field)[uid] for field in PLAIN_FIELDS if uid in getattr(handler, field)}
    navigation['_compare'] = sorted(handler._compare.get(uid, set()))
    if uid in handler._products_cache:
        navigation['_products_cache'] = [asdict(p) for p in handler._products_cache[uid]]
    if uid in handler._detail:
        navigation['_detail'] = asdict(handler._detail[uid])
    if uid in handler._compare_products:
        navigation['_compare_products'] = {key: asdict(p) for key, p in handler._compare_products[uid].items()}
    return {'version': 1, 'language': language, 'navigation': navigation,
            'fsm_state': fsm_state, 'fsm_data': fsm_data}
