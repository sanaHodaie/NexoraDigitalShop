from app.domain.errors import BusinessError, Conflict


class Shopping:
    def __init__(self, uow):
        self.uow = uow

    def products(self, query=None, category=None, limit=100):
        query = query.strip() if query else None
        if query and len(query) > 100:
            raise BusinessError(400, "Search too long")
        with self.uow() as tx:
            return tx.products.search(query, category, max(1, min(limit, 100)))

    def product(self, pid):
        with self.uow() as tx:
            product = tx.products.get(pid)
            if product is None:
                raise BusinessError(404, "Product not found")
            return product

    def cart(self, uid):
        with self.uow() as tx:
            items = tx.cart.list(uid)
            products = tx.products.get_many([pid for pid, _ in items])
            return [
                {"product": products[pid].public(), "quantity": qty} for pid, qty in items if pid in products
            ]

    def put_cart(self, uid, pid, quantity):
        if not 0 <= quantity <= 99:
            raise BusinessError(400, "Quantity must be between 0 and 99")
        with self.uow() as tx:
            tx.users.get(uid, lock=True)
            if quantity:
                product = tx.products.get(pid)
                if product is None:
                    raise BusinessError(404, "Product not found")
                if product.stock < quantity:
                    raise BusinessError(409, "Insufficient stock")
            tx.cart.put(uid, pid, quantity)
            tx.commit()

    def clear_cart(self, uid):
        with self.uow() as tx:
            tx.users.get(uid, lock=True)
            tx.cart.clear(uid)
            tx.commit()

    def wishlist(self, uid):
        with self.uow() as tx:
            return [product.public() for product in tx.products.get_many(tx.wishlist.list(uid)).values()]

    def put_wishlist(self, uid, pid):
        with self.uow() as tx:
            tx.users.get(uid, lock=True)
            if tx.products.get(pid) is None:
                raise BusinessError(404, "Product not found")
            tx.wishlist.put(uid, pid)
            tx.commit()

    def remove_wishlist(self, uid, pid):
        with self.uow() as tx:
            tx.users.get(uid, lock=True)
            tx.wishlist.remove(uid, pid)
            tx.commit()

    def newsletter(self, email):
        try:
            with self.uow() as tx:
                tx.subscribe(email)
                tx.commit()
        except Conflict:
            pass
