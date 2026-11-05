"""Customer service and wholesale intake. Confirmation precedes any backend write."""

import re
from uuid import uuid4

from aiogram import F
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import BufferedInputFile, InlineKeyboardButton, InlineKeyboardMarkup
from api_client import ApiConfigurationError, ApiError, ApiHttpError
from keyboards import keyboard, main_menu_kb

COPY = {
    "fa": {
        "wholesale": "📦 درخواست خرید عمده",
        "support": "💬 درخواست پشتیبانی",
        "faq": "❓ سؤالات متداول",
        "mine": "📋 پیگیری درخواست‌ها",
        "confirm": "✅ تأیید و ارسال درخواست",
        "cancel": "انصراف",
        "intro": "به میز ارتباط با مشتریان نکسورا خوش آمدید. برای خرید عمده، استعلام قیمت و پیگیری درخواست، از منوی پایین استفاده کنید.",
        "consent": "اطلاعات این فرم فقط برای رسیدگی تیم فروش/پشتیبانی در پنل مدیریت ثبت می‌شود. رمز عبور، کد ورود و اطلاعات کارت بانکی نفرستید. هر زمان خواستید /cancel بزنید.",
        "name": "نام و نام خانوادگی را بنویسید:",
        "phone": "شماره تماس قابل دسترس را وارد کنید:",
        "company": "نام شرکت یا فروشگاه (اگر ندارید، - بفرستید):",
        "items": "نام کالاها و مشخصات موردنیاز را بنویسید. برای پشتیبانی، موضوع مشکل را توضیح دهید:",
        "quantity": "تعداد کل موردنیاز را به عدد بنویسید (تعداد هر کالا را در توضیحات مشخص کنید):",
        "city": "شهر مقصد را بنویسید:",
        "address": "نشانی مقصد را بنویسید:",
        "notes": "توضیحات تکمیلی؛ برای عمده، تعداد هر قلم و زمان موردنیاز را بنویسید. اگر ندارید - بفرستید:",
        "invalid": "مقدار معتبر وارد کنید؛ شماره تماس ۸ تا ۱۵ رقم، تعداد بین ۱ تا ۱۰۰۰۰۰۰ و متن کوتاه و روشن باشد.",
        "review": "پیش از ارسال، اطلاعات را بررسی کنید. این یک درخواست استعلام است؛ خرید قطعی، قیمت یا زمان تحویل هنوز تأیید نشده است.",
        "saved": "✅ درخواست شما با شماره {id} ثبت شد. تیم فروش/پشتیبانی آن را در پنل بررسی می‌کند. وضعیت را از «پیگیری درخواست‌ها» ببینید.",
        "failed": "ثبت درخواست تأیید نشد. دوباره «تأیید و ارسال» را بزنید یا بعداً تلاش کنید؛ موفقیت فقط پس از تأیید سرور اعلام می‌شود.",
        "empty": "هنوز درخواستی از این حساب تلگرام ثبت نشده است.",
        "cancelled": "فرم کنار گذاشته شد. درخواست‌های قبلی را از بخش پیگیری بررسی کنید.",
    },
    "en": {
        "wholesale": "📦 Wholesale enquiry",
        "support": "💬 Support request",
        "faq": "❓ Frequently asked questions",
        "mine": "📋 My requests",
        "confirm": "✅ Confirm and submit",
        "cancel": "Cancel",
        "intro": "Welcome to Nexora customer care. Use the menu below for wholesale enquiries, support and request tracking.",
        "consent": "This form is shared with the sales/support team in the management panel. Do not send passwords, login codes or payment-card details. Use /cancel at any time.",
        "name": "Your full name:",
        "phone": "Your reachable phone number:",
        "company": "Company/store name, or - to skip:",
        "items": "Required products and specifications, or describe your support issue:",
        "quantity": "Total quantity as a number (specify quantities per item in notes):",
        "city": "Destination city:",
        "address": "Destination address:",
        "notes": "Additional details and quantities per item, or - to skip:",
        "invalid": "Enter a valid value: phone 8–15 digits, quantity 1–1000000, or a clear bounded text.",
        "review": "Review your details. This is an enquiry; price, purchase and delivery time are not confirmed.",
        "saved": "✅ Request {id} was saved for the sales/support team. Use My requests to follow its status.",
        "failed": "Submission was not confirmed. Retry Confirm and submit later; success is shown only after server confirmation.",
        "empty": "No requests have been submitted from this Telegram account yet.",
        "cancelled": "Form closed. Use My requests to review any previously submitted enquiry.",
    },
}
FAQ = {
    "fa": [
        (
            "حداقل خرید عمده چقدر است؟",
            "حداقل تعداد ثابتی اعلام نشده است؛ اقلام و تعداد موردنیاز را در فرم عمده ثبت کنید تا تیم فروش شرایط را بررسی کند.",
        ),
        (
            "قیمت عمده چطور تعیین می‌شود؟",
            "قیمت نهایی پس از بررسی کالا، تعداد و شرایط تأمین توسط تیم فروش اعلام می‌شود. ثبت فرم به معنی خرید قطعی نیست.",
        ),
        (
            "ارسال و پرداخت چطور انجام می‌شود؟",
            "شهر و نشانی مقصد را در فرم ثبت کنید. روش پرداخت، هزینه و زمان ارسال باید در پیشنهاد نهایی تیم فروش تأیید شوند؛ فعلاً مبلغی در ربات دریافت نمی‌شود.",
        ),
        (
            "درخواستم را چطور پیگیری کنم؟",
            "از «پیگیری درخواست‌ها» استفاده کنید. وضعیت همان درخواستی نمایش داده می‌شود که از این حساب تلگرام ثبت کرده‌اید.",
        ),
        (
            "برای گارانتی یا مشکل سفارش چه کنم؟",
            "«درخواست پشتیبانی» را بزنید و موضوع و شماره سفارش را در توضیحات بنویسید. شرایط دقیق گارانتی/مرجوعی باید برای همان سفارش بررسی شود.",
        ),
    ],
    "en": [
        (
            "What is the wholesale minimum?",
            "No fixed minimum is published. Submit the products and quantities for the sales team to review.",
        ),
        (
            "How is wholesale pricing decided?",
            "The team confirms pricing after reviewing products, quantity and availability. An enquiry is not a confirmed purchase.",
        ),
        (
            "How do shipping and payment work?",
            "Provide the destination. Payment, shipping cost and delivery time require confirmation in the final quote. This bot does not collect payment.",
        ),
        (
            "How can I track my enquiry?",
            "Use My requests. Only requests submitted from this Telegram account are shown.",
        ),
        (
            "What about warranty or order issues?",
            "Submit a Support request and include the order reference. The team will check the terms for that specific order.",
        ),
    ],
}
STATUS = {
    "new": "جدید",
    "reviewing": "در حال بررسی",
    "contacted": "تماس گرفته شد",
    "quoted": "پیشنهاد قیمت ارائه شد",
    "closed": "بسته شد",
    "cancelled": "لغو شد",
    "approved": "تأیید شد",
}
FIELDS = ("name", "phone", "company", "items", "quantity", "city", "address", "notes")
MAX = {
    "name": 100,
    "phone": 20,
    "company": 150,
    "items": 2000,
    "city": 100,
    "address": 600,
    "notes": 2000,
}


class CustomerFlow(StatesGroup):
    collecting = State()
    review = State()


class CustomerSupport:
    def register_customer_support(self):
        labels = {
            value[key]
            for value in COPY.values()
            for key in ("wholesale", "support", "faq", "mine", "cancel")
        }
        self.router.message.register(self.crm_navigation, F.text.in_(labels))
        self.router.callback_query.register(
            self.crm_invoice, F.data.startswith("invoice:")
        )
        self.router.callback_query.register(
            self.crm_faq_answer, F.data.startswith("faq:")
        )

    def register_customer_form_handlers(self):
        self.router.message.register(self.crm_submit, CustomerFlow.review)
        self.router.message.register(self.crm_collect, CustomerFlow.collecting)

    def crm_text(self, uid):
        return COPY[self.lang_of(uid)]

    async def crm_navigation(self, message, state):
        uid = message.from_user.id
        lang, text = self.lang_of(uid), self.crm_text(uid)
        action = next(
            (
                key
                for key in ("wholesale", "support", "faq", "mine", "cancel")
                if any(c[key] == message.text for c in COPY.values())
            ),
            None,
        )
        await state.clear()
        if action in ("wholesale", "support"):
            fields = (
                list(FIELDS)
                if action == "wholesale"
                else ["name", "phone", "items", "notes"]
            )
            await state.set_state(CustomerFlow.collecting)
            await state.set_data(
                {
                    "kind": action,
                    "fields": fields,
                    "step": 0,
                    "request_key": str(uuid4()),
                    "details": {
                        "company": "",
                        "quantity": 1,
                        "city": "ثبت نشده",
                        "address": "ثبت نشده",
                        "notes": "",
                    },
                }
            )
            await message.answer(
                text["consent"] + "\n\n" + text[fields[0]],
                reply_markup=main_menu_kb(lang),
            )
        elif action == "faq":
            buttons = [
                [InlineKeyboardButton(text=q, callback_data=f"faq:{i}")]
                for i, (q, a) in enumerate(FAQ[lang])
            ]
            await message.answer(
                text["faq"], reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons)
            )
        elif action == "mine":
            try:
                result = await self.client.customer_requests(uid)
            except ApiError:
                await message.answer(text["failed"], reply_markup=main_menu_kb(lang))
                return
            items = result["items"]
            lines = [
                f"#{r['id']} · {r.get('trackingCode') or '—'} · {text['wholesale'] if r['kind'] == 'wholesale' else text['support']} · {STATUS.get(r['status'], r['status']) if lang == 'fa' else r['status']}"
                for r in items
            ]
            await message.answer(
                "\n".join(lines) or text["empty"], reply_markup=main_menu_kb(lang)
            )
            invoices = [
                [
                    InlineKeyboardButton(
                        text="📄 فاکتور " + str(r.get("trackingCode") or r["id"]),
                        callback_data="invoice:" + str(r["id"]),
                    )
                ]
                for r in items
                if r.get("hasInvoice")
            ]
            if invoices:
                await message.answer(
                    "فاکتور تأییدشده را از اینجا دانلود کنید:",
                    reply_markup=InlineKeyboardMarkup(inline_keyboard=invoices),
                )
        else:
            await message.answer(text["cancelled"], reply_markup=main_menu_kb(lang))

    async def crm_faq_answer(self, cb):
        lang = self.lang_of(cb.from_user.id)
        try:
            index = int(cb.data.split(":")[1])
            if not 0 <= index < len(FAQ[lang]):
                return
        except (ValueError, IndexError):
            return
        await cb.answer()
        question, answer = FAQ[lang][index]
        await cb.message.answer(
            question + "\n\n" + answer, reply_markup=main_menu_kb(lang)
        )

    async def crm_collect(self, message, state):
        data = await state.get_data()
        field = data["fields"][data["step"]]
        text = self.crm_text(message.from_user.id)
        value = (message.text or "").strip()
        if field in ("phone", "quantity"):
            value = value.translate(
                str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
            )
        if field == "phone":
            value = value.replace(" ", "").replace("-", "")
        valid = (
            bool(re.fullmatch(r"\+?[0-9]{8,15}", value))
            if field == "phone"
            else (
                len(value) <= 7
                and value.isascii()
                and value.isdigit()
                and 1 <= int(value) <= 1000000
                if field == "quantity"
                else (value == "-" and field in ("company", "notes"))
                or (
                    2 <= len(value) <= MAX[field]
                    and (field != "address" or len(value) >= 5)
                )
            )
        )
        if not valid:
            await message.answer(text["invalid"] + "\n" + text[field])
            return
        if value == "-" and field in ("company", "notes"):
            value = ""
        data["details"][field] = int(value) if field == "quantity" else value
        data["step"] += 1
        await state.set_data(data)
        if data["step"] < len(data["fields"]):
            await message.answer(text[data["fields"][data["step"]]])
        else:
            await state.set_state(CustomerFlow.review)
            summary = "\n".join(
                f"{text.get(key, key).split(':')[0]}: {value}"
                for key, value in data["details"].items()
                if value
            )
            await self.send_long(
                message,
                text["review"] + "\n\n" + summary,
                keyboard([[text["confirm"]], [text["cancel"]]]),
            )

    async def crm_submit(self, message, state):
        uid = message.from_user.id
        text = self.crm_text(uid)
        if message.text not in {c["confirm"] for c in COPY.values()}:
            await message.answer(text["review"])
            return
        data = await state.get_data()
        try:
            result = await self.client.create_customer_request(
                {
                    "request_key": data["request_key"],
                    "telegram_user_id": uid,
                    "telegram_username": message.from_user.username or "",
                    "kind": data["kind"],
                    "details": data["details"],
                }
            )
        except ApiConfigurationError:
            await message.answer(
                "ارتباط امن فروشگاه تنظیم نشده است؛ مسئول فروشگاه باید کلید مشترک بات و بک‌اند را تنظیم کند. فرم شما برای تلاش مجدد حفظ شد."
            )
            return
        except ApiHttpError as exc:
            reasons = {
                401: "کلید ارتباط بات و فروشگاه تأیید نشد؛ تنظیمات باید توسط مسئول فروشگاه بررسی شود.",
                404: "نسخهٔ ثبت درخواست روی سرور فروشگاه در دسترس نیست؛ بک‌اند باید به‌روز شود.",
                400: "سرور اطلاعات فرم را نپذیرفت؛ با /cancel فرم جدیدی تکمیل کنید.",
                503: "بخش ثبت درخواست موقتاً آماده نیست؛ مسئول فروشگاه باید وضعیت استقرار و دیتابیس را بررسی کند.",
            }
            await message.answer(reasons.get(exc.status_code, text["failed"]))
            return
        except ApiError:
            await message.answer(text["failed"])
            return
        await state.clear()
        await message.answer(
            text["saved"].format(id=result["id"]),
            reply_markup=main_menu_kb(self.lang_of(uid)),
        )

    async def crm_invoice(self, cb):
        await cb.answer()
        try:
            rid = int(cb.data.split(":", 1)[1])
            if rid < 1:
                return
            pdf = await self.client.customer_invoice(cb.from_user.id, rid)
        except (ApiError, ValueError):
            await cb.message.answer("فاکتور در دسترس نیست یا به این حساب تعلق ندارد.")
            return
        await cb.message.answer_document(
            BufferedInputFile(pdf, filename="Nexora-invoice-" + str(rid) + ".pdf")
        )
