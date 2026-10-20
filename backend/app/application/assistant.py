"""Read-only assistant use cases with live catalogue access and explicit management permissions."""

from app.application.management import Management
from app.domain.assistant import answer, local_plan

DEFAULTS = {
    "enabled": True,
    "useModel": True,
    "maxRecommendations": 3,
    "dailyLimit": 300,
    "greeting": "سلام! برای انتخاب محصول، کاربرد و بودجه‌ات را بگو.",
}


class Assistant:
    def __init__(self, uow):
        self.uow = uow

    def configuration(self, uid=None):
        with self.uow() as tx:
            if uid is not None:
                Management.authorize(tx, uid, "assistant:read")
            doc = tx.management.documents().get("assistant")
            return doc if doc else {"data": dict(DEFAULTS), "version": 0}

    def save(self, uid, data, version):
        with self.uow() as tx:
            Management.authorize(tx, uid, "assistant:write")
            result = tx.management.save_document("assistant", data, version)
            tx.audit("ASSISTANT_SETTINGS_UPDATED", uid)
            tx.commit()
            return result

    def respond(self, messages, config, suggested=None, provider="openai"):
        plan = local_plan(messages)
        if suggested is not None:
            # Explicit, locally recognized currency and safety constraints always win.
            if plan.use_case != "general":
                suggested.use_case = plan.use_case
                suggested.category = "laptops"
            if plan.device != "any":
                suggested.device = plan.device
            if plan.max_rial is not None:
                suggested.max_rial = plan.max_rial
            if plan.clarify_budget:
                suggested.clarify_budget = True
            if plan.min_ram:
                suggested.min_ram = max(plan.min_ram, suggested.min_ram or 0)
            plan = suggested
        with self.uow() as tx:
            products = tx.products.all_active()
        result = answer(products, plan, messages, config["maxRecommendations"])
        result["mode"] = provider if suggested is not None else "catalog"
        if plan.use_case == "android":
            result["sources"] = [
                {
                    "title": "نیازمندی‌های رسمی Android Studio",
                    "url": "https://developer.android.com/studio/install",
                }
            ]
        return result
