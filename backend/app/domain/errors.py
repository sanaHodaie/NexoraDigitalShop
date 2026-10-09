class BusinessError(Exception):
    def __init__(self, status, message, code="REQUEST_FAILED"):
        self.status, self.message, self.code = status, message, code
        super().__init__(code)


class Conflict(Exception):
    """Persistence uniqueness conflict, independent of a database driver."""
