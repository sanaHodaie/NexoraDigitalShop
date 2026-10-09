import ast
from datetime import timedelta
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app.application.orders import InventoryReservation, Orders
from app.domain.entities import Line, Session, order_total, utcnow
from app.domain.errors import BusinessError


def test_domain_and_application_have_no_outward_dependencies():
    root = Path(__file__).resolve().parents[2] / "app"
    forbidden = (
        "sqlalchemy",
        "fastapi",
        "starlette",
        "app.infrastructure",
        "app.presentation",
        "app.core",
        "app.models",
        "app.db",
        "app.config",
        "app.bootstrap",
    )
    for layer in ["domain", "application"]:
        for path in (root / layer).glob("*.py"):
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                modules = (
                    [node.module or ""]
                    if isinstance(node, ast.ImportFrom)
                    else [item.name for item in node.names]
                    if isinstance(node, ast.Import)
                    else []
                )
                assert not any(module.startswith(forbidden) for module in modules), path


def test_session_absolute_idle_and_revocation_boundaries():
    now = utcnow()
    session = Session("hash", 1, now + timedelta(days=1), now, now)
    assert session.active(now, 60)
    assert not session.active(now + timedelta(seconds=60), 60)
    session.last_used_at = now + timedelta(days=1)
    assert not session.active(now + timedelta(days=1), 60)
    session.revoked_at = now
    assert not session.active(now, 60)


@pytest.mark.parametrize("price,quantity,total", [("10", 2, "29.99"), ("99", 1, "99"), ("0.10", 3, "10.29")])
def test_money_uses_decimal_and_server_shipping(price, quantity, total):
    assert order_total([Line("p", quantity, Decimal(price))]) == Decimal(total)


def test_inventory_reservation_locks_in_deterministic_order():
    inventory = Mock()
    inventory.reserve.return_value = True
    products = Mock()
    products.get.return_value = SimpleNamespace(price=Decimal("42"), name="Product")
    lines = InventoryReservation.reserve(
        SimpleNamespace(inventory=inventory, products=products), [("z", 1), ("a", 2)]
    )
    assert [call.args[0] for call in inventory.reserve.call_args_list] == ["a", "z"]
    assert lines[0].unit_price == Decimal("42")


def test_create_order_uses_uow_rollback_path_on_reservation_failure():
    tx = Mock()
    tx.__enter__ = Mock(return_value=tx)
    tx.__exit__ = Mock(return_value=False)
    tx.users.get.return_value = SimpleNamespace(email_verified_at=utcnow())
    tx.cart.list.return_value = [("p", 1)]
    tx.inventory.reserve.return_value = False
    with pytest.raises(BusinessError):
        Orders(lambda: tx).create(1)
    tx.commit.assert_not_called()
    assert tx.__exit__.call_args.args[0] is BusinessError
