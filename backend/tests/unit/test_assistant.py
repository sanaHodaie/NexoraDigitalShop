import asyncio
import json
from decimal import Decimal

import httpx
import pytest
from pydantic import SecretStr

from app.domain.assistant import Plan, answer, hardware, local_plan, normalize, rial
from app.domain.entities import Product
from app.infrastructure.assistant_llm import OpenAIPlanner


def laptop(pid="one", ram=16, storage=512, stock=2, price="600"):
    return Product(
        pid,
        "لپ‌تاپ آزمایشی",
        "Test Laptop",
        "laptops",
        Decimal(price),
        stock,
        {"specs": [f"رم {ram} گیگابایت", f"SSD {storage} گیگابایت", "Intel Core i5"]},
    )


def test_digits_budget_units_and_followup():
    assert normalize("عربي ۱۲٣ لپ‌تاپ") == "عربی 123 لپ تاپ"
    plan = local_plan(["لپ‌تاپ برای برنامه‌نویسی", "تا ۵۰ میلیون تومان"])
    assert (plan.category, plan.device, plan.use_case, plan.max_rial) == (
        "laptops",
        "laptop",
        "programming",
        500000000,
    )
    assert local_plan(["هدفون تا ۲۰۰۰۰۰۰۰ ریال"]).max_rial == 20000000
    assert local_plan(["تا 50,000,000 تومان"]).max_rial == 500000000
    assert local_plan(["لپتاپ تا ۵۰ میلیون"]).clarify_budget
    assert local_plan(["لپتاپ با رم ۱۶"]).max_rial is None
    assert (
        local_plan(["لپتاپ برای برنامه نویسی تا ۵۰ میلیون تومان", "حالا هدفون میخوام"]).use_case == "general"
    )
    assert rial("205.761315") == 123456789


def test_programming_filters_known_specs_budget_and_device():
    good = laptop()
    desktop = laptop("desktop")
    desktop.name = "کامپیوتر رومیزی"
    desktop.name_en = "Apple iMac"
    bad = laptop("unknown")
    bad.payload["specs"] = None
    plan = local_plan(["لپ‌تاپ برای برنامه‌نویسی تا ۵۰ میلیون تومان"])
    products = [
        good,
        laptop("small", ram=8),
        laptop("no-stock", stock=0),
        laptop("expensive", price="9999"),
        desktop,
        bad,
    ]
    result = answer(products, plan, ["برنامه نویسی"])
    assert [p["id"] for p in result["products"]] == ["one"]
    assert "۱۶" in result["text"]
    assert hardware(bad) == (None, None)
    assert not answer(products, local_plan(["لپ تاپ برای داکر"]), [])["products"]


def test_no_invented_product_or_unknown_specs():
    result = answer([laptop()], Plan(category="laptops", queries=["Imaginary 999"]), [])
    assert not result["products"]
    bad = laptop()
    bad.payload["specs"] = None
    result = answer([bad], Plan(queries=["Test Laptop"], intent="details"), [])
    assert result["products"][0]["specs"] == []
    assert result["products"][0]["priceRial"] == 360000000


def test_new_category_does_not_keep_previous_named_products():
    phone = laptop("phone-001")
    phone.category = "smartphones"
    result = answer(
        [laptop("computer-001"), phone], Plan(category="smartphones"), ["computer-001", "حالا گوشی میخوام"]
    )
    assert result["products"][0]["id"] == "phone-001"


def test_brand_and_category_use_case_distinction():
    assert local_plan(["گوشی سامسونگ با دوربین خوب"]).category == "smartphones"
    assert local_plan(["هدفون گیمینگ"]).category == "audio"
    assert local_plan(["لپتاپ لنوو برای برنامه نویسی"]).queries == ["lenovo"]
    assert local_plan(["گوشی اپل", "حالا هدفون سونی"]).queries == ["sony"]


def test_comparison_and_out_of_stock_are_factual():
    a, b = laptop("test-001"), laptop("test-002", stock=0)
    b.payload["specs"] = ["رم ۸ گیگابایت"]
    result = answer([a, b], Plan(intent="compare", queries=["test-001", "test-002"]), [])
    assert len(result["products"]) == 2
    assert result["products"][1]["inStock"] is False
    assert not answer([a], Plan(intent="compare"), ["compare test-001"])["products"]
    assert not answer([a, b], Plan(intent="compare", queries=["Test Laptop"]), [])["products"]


def test_shipping_uses_order_policy():
    result = answer([], Plan(intent="shipping"), [])
    assert "۵۹٬۴۰۰٬۰۰۰" in result["text"]
    assert "۵٬۹۹۴٬۰۰۰" in result["text"]


def payload(**changes):
    return (
        dict(
            category="laptops",
            use_case="programming",
            device="laptop",
            queries=[],
            max_rial=None,
            min_ram=None,
            intent="recommend",
            sort="price_asc",
            clarify_budget=False,
        )
        | changes
    )


def planner(settings, handler):
    settings.openai_api_key = SecretStr("test-provider-secret")
    settings.assistant_model = "configured-model"
    return OpenAIPlanner(settings, httpx.MockTransport(handler))


def test_provider_strict_plan_and_bounded_context(settings):
    def handler(request):
        body = json.loads(request.content)
        assert body["store"] is False
        assert body["model"] == "configured-model"
        assert body["tool_choice"]["function"]["name"] == "plan_search"
        assert body["messages"][-1]["content"] == "لپتاپ برای برنامه نویسی"
        assert "products" not in body
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "tool_calls": [
                                {"function": {"name": "plan_search", "arguments": json.dumps(payload())}}
                            ]
                        }
                    }
                ]
            },
        )

    result = asyncio.run(planner(settings, handler).plan(["لپتاپ برای برنامه نویسی"]))
    assert result.use_case == "programming"


@pytest.mark.parametrize(
    "response",
    [
        {"choices": [{"message": {"content": "Buy invented product for 1 rial"}}]},
        {
            "choices": [
                {"message": {"tool_calls": [{"function": {"name": "delete_users", "arguments": "{}"}}]}}
            ]
        },
        {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "plan_search",
                                    "arguments": json.dumps(payload(max_rial=-1)),
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            "choices": [
                {"message": {"tool_calls": [{"function": {"name": "plan_search", "arguments": "not json"}}]}}
            ]
        },
    ],
)
def test_invalid_provider_output_fails_to_catalog(settings, response):
    assert (
        asyncio.run(planner(settings, lambda _: httpx.Response(200, json=response)).plan(["hello"])) is None
    )


def test_provider_failure_and_oversize_do_not_leak(settings, caplog):
    for response in (
        httpx.Response(401, text="test-provider-secret"),
        httpx.Response(200, content=b"x" * 70000),
    ):
        assert asyncio.run(planner(settings, lambda _, r=response: r).plan(["private question"])) is None
    assert "test-provider-secret" not in caplog.text
    assert "private question" not in caplog.text
