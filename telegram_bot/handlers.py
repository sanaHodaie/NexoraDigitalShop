
"""هندلرها و منوهای ربات فروشگاه NexoraDigitalShop (فارسی/انگلیسی)."""

import logging
from collections import defaultdict
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib.parse import urljoin

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from api_client import (
    ApiDataError,
    ApiError,
    ApiHttpError,
    ApiNetworkError,
    NexoraClient,
    Product,
)
from config import Config
from keyboards import (
    callback_id,
    language_kb,
    main_menu_kb,
    product_kb,
    products_list_kb,
)
from settings_store import SettingsStore
from texts import tr

logger = logging.getLogger(__name__)


class SearchStates(StatesGroup):
    waiting_query = State()


def fmt_price(value) -> str:
    if value is None or isinstance(value, bool):
        return "—"
    try:
        # Same catalogue rate as src/lib/money.js; API price is not rial.
        rial = (Decimal(str(value)) * 600000).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        return f"{rial:,}"
    except (InvalidOperation, ValueError):
        return "—"


def fmt_availability(p: Product, lang: str) -> str:
    if p.available is None:
        return tr(lang, "stock_unknown")

    if not p.available:
        return tr(lang, "out_of_stock")

    if p.stock is not None:
        return tr(lang, "in_stock_count").format(count=p.stock)

    return tr(lang, "in_stock")


def fmt_details(
    p: Product,
    lang: str,
    price_suffix: str = "",
) -> str:
    lines = [f"🛍 {p.name}", ""]

    lines.append(
        f"{tr(lang, 'label_price')}: "
        f"{fmt_price(p.price)}{price_suffix}"
    )

    lines.append(
        f"{tr(lang, 'label_availability')}: "
        f"{fmt_availability(p, lang)}"
    )

    if p.description:
        lines.append("")
        lines.append(f"{tr(lang, 'label_description')}:")
        lines.append(str(p.description)[:600])

    return "\n".join(lines)


class NexoraHandlers:

    def __init__(
        self,
        cfg: Config,
        client: NexoraClient,
        store: SettingsStore,
    ):
        self.cfg = cfg
        self.client = client
        self.store = store

        self.router = Router(name="nexora")
        self.router.message.filter(F.chat.type == "private")
        self.router.callback_query.filter(F.message.chat.type == "private")

        self._products_cache: dict[int, list[Product]] = {}
        self._compare: dict[int, set[str]] = defaultdict(set)
        self._page: dict[int, int] = defaultdict(int)
        self._compare_mode: dict[int, bool] = defaultdict(bool)

        self._register()

    # --------------------------------------------------
    # ابزارهای داخلی
    # --------------------------------------------------

    def lang_of(self, user_id: int) -> str:
        return self.store.get_lang(user_id)

    def _register(self) -> None:
        r = self.router

        # دستورات اصلی
        r.message.register(
            self.cmd_start,
            CommandStart(),
        )

        r.message.register(
            self.cmd_help,
            Command("help"),
        )

        r.message.register(
            self.cmd_language,
            Command("language"),
        )

        r.message.register(
            self.cmd_ping,
            Command("ping"),
        )

        r.message.register(
            self.cmd_link,
            Command("link"),
        )

        r.message.register(
            self.cmd_cancel,
            Command("cancel"),
        )

        # دکمه‌های منو
        r.callback_query.register(
            self.cb_noop,
            F.data == "noop",
        )

        r.callback_query.register(
            self.cb_back_main,
            F.data == "back:main",
        )

        r.callback_query.register(
            self.cb_products,
            F.data == "menu:products",
        )

        r.callback_query.register(
            self.cb_page,
            F.data.startswith("page:"),
        )

        r.callback_query.register(
            self.cb_product,
            F.data.startswith("prod:"),
        )

        r.callback_query.register(
            self.cb_search_start,
            F.data == "menu:search",
        )

        r.message.register(
            self.msg_search,
            SearchStates.waiting_query,
        )

        r.callback_query.register(
            self.cb_compare_start,
            F.data == "menu:compare",
        )

        r.callback_query.register(
            self.cb_compare_toggle,
            F.data.startswith("cmp:toggle:"),
        )

        r.callback_query.register(
            self.cb_compare_show,
            F.data == "cmp:show",
        )

        r.callback_query.register(
            self.cb_compare_clear,
            F.data == "cmp:clear",
        )

        r.callback_query.register(
            self.cb_language,
            F.data == "menu:language",
        )

        r.callback_query.register(
            self.cb_set_lang,
            F.data.startswith("lang:"),
        )

        # پیام‌های ناشناخته
        r.message.register(
            self.any_message,
            F.text,
        )

    async def _edit(
        self,
        message: Message,
        text: str,
        kb,
    ) -> None:
        try:
            await message.edit_text(
                text,
                reply_markup=kb,
            )

        except Exception:
            await message.answer(
                text,
                reply_markup=kb,
            )

    async def _show_main(
        self,
        target,
        lang: str,
    ) -> None:
        if isinstance(target, CallbackQuery):
            await self._edit(
                target.message,
                tr(lang, "main_menu"),
                main_menu_kb(lang),
            )
        else:
            await target.answer(
                tr(lang, "main_menu"),
                reply_markup=main_menu_kb(lang),
            )

    def _api_error_text(
        self,
        exc: Exception,
        lang: str,
    ) -> str:
        if isinstance(exc, ApiNetworkError):
            return tr(lang, "err_network")

        if isinstance(exc, ApiHttpError):
            return tr(lang, "err_http").format(
                status=exc.status_code
            )

        if isinstance(exc, ApiDataError):
            return tr(lang, "err_data")

        return tr(lang, "err_generic")

    async def _answer_api_error(
        self,
        message: Message,
        lang: str,
        exc: Exception,
    ) -> None:
        logger.warning(
            "خطای API فروشگاه: %s",
            exc,
        )

        await message.answer(
            self._api_error_text(exc, lang),
            reply_markup=main_menu_kb(lang),
        )

    async def _show_products_page(
        self,
        message: Message,
        lang: str,
        uid: int,
        products: list[Product],
        page: int,
        compare_mode: bool = False,
    ) -> None:
        self._page[uid] = page
        self._compare_mode[uid] = compare_mode

        if compare_mode:
            text = tr(lang, "compare_hint")
        else:
            text = tr(lang, "products_title").format(
                count=len(products)
            )

        kb = products_list_kb(
            products,
            page,
            self.cfg.page_size,
            lang,
            compare_mode,
            self._compare[uid],
        )

        await self._edit(
            message,
            text,
            kb,
        )

    # --------------------------------------------------
    # اتصال مستقیم حساب تلگرام
    # --------------------------------------------------

    async def _complete_direct_link(
        self,
        message: Message,
        token: str,
        lang: str,
    ) -> bool:
        """
        تکمیل اتصال مستقیم با توکن دریافتی از لینک سایت.

        شناسه تلگرام فقط از پیام واقعی دریافتی از Telegram
        خوانده می‌شود و از کاربر درخواست نمی‌شود.
        """

        telegram_user = message.from_user

        if telegram_user is None:
            await message.answer(
                "امکان شناسایی حساب تلگرام وجود ندارد."
            )
            return False

        try:
            result = await self.client.complete_telegram_direct_link(
                token=token,
                telegram_user_id=telegram_user.id,
            )

        except ApiNetworkError:
            await message.answer(
                "ارتباط با سرور فروشگاه برقرار نشد. "
                "لطفاً کمی بعد دوباره روی لینک اتصال کلیک کنید."
            )
            return False

        except ApiHttpError as exc:

            if exc.status_code == 401:
                text = (
                    "احراز هویت ربات توسط سرور تأیید نشد. "
                    "تنظیمات امنیتی باید بررسی شود."
                )

            elif exc.status_code == 409:
                text = (
                    "این حساب تلگرام یا حساب فروشگاه "
                    "قبلاً به حساب دیگری متصل شده است."
                )

            elif exc.status_code in (400, 404, 422):
                text = (
                    "لینک اتصال نامعتبر یا منقضی شده است. "
                    "لطفاً از داخل حساب کاربری سایت، "
                    "یک لینک جدید دریافت کنید."
                )

            else:
                text = (
                    "سرور فروشگاه نتوانست اتصال حساب را تکمیل کند. "
                    "لطفاً بعداً دوباره تلاش کنید."
                )

            await message.answer(text)
            return False

        except ApiDataError:
            await message.answer(
                "پاسخ سرور برای تکمیل اتصال معتبر نبود."
            )
            return False

        except ApiError:
            await message.answer(
                "در زمان اتصال حساب خطایی رخ داد."
            )
            return False

        # فقط پس از تأیید صریح بک‌اند، موفقیت اعلام می‌کنیم.
        if not isinstance(result, dict) or result.get("linked") is not True:
            await message.answer(
                "سرور فروشگاه اتصال حساب را تأیید نکرد."
            )
            return False

        success_messages = {
            "fa": (
                "✅ حساب تلگرام شما با موفقیت به حساب "
                "کاربری NexoraDigitalShop متصل شد.\n\n"
                "وضعیت اتصال را می‌توانید در حساب سایت ببینید."
            ),
            "en": (
                "✅ Your Telegram account has been successfully "
                "linked to your NexoraDigitalShop account.\n\n"
                "You can review or remove this link in your website account."
            ),
        }

        await message.answer(
            success_messages.get(lang, success_messages["fa"]),
            reply_markup=main_menu_kb(lang),
        )

        return True

    # --------------------------------------------------
    # دستورات
    # --------------------------------------------------

    async def cmd_start(
        self,
        message: Message,
        state: FSMContext,
    ) -> None:
        await state.clear()

        telegram_user = message.from_user

        if telegram_user is None:
            await message.answer(
                "امکان شناسایی حساب تلگرام وجود ندارد."
            )
            return

        lang = self.lang_of(telegram_user.id)

        # بررسی آرگومان دستور /start
        # نمونه: /start TOKEN
        command_text = (message.text or "").strip()
        parts = command_text.split(maxsplit=1)

        if len(parts) > 1:
            token = parts[1].strip()

            # محدودیت طول و جلوگیری از پردازش ورودی نامعتبر
            if not token or len(token) > 128 or any(
                char.isspace() for char in token
            ):
                await message.answer(
                    "لینک اتصال معتبر نیست. "
                    "لطفاً از داخل سایت یک لینک جدید دریافت کنید."
                )
                return

            await self._complete_direct_link(
                message=message,
                token=token,
                lang=lang,
            )
            return

        # اگر توکنی همراه /start نبود، خوشامدگویی عادی
        name = telegram_user.first_name or ""

        await message.answer(
            tr(lang, "welcome").format(name=name),
            reply_markup=main_menu_kb(lang),
        )

    async def cmd_help(
        self,
        message: Message,
        state: FSMContext,
    ) -> None:
        await state.clear()

        lang = self.lang_of(message.from_user.id)

        await message.answer(
            tr(lang, "help"),
            reply_markup=main_menu_kb(lang),
        )

    async def cmd_language(
        self,
        message: Message,
        state: FSMContext,
    ) -> None:
        await state.clear()

        await message.answer(
            tr("fa", "choose_language"),
            reply_markup=language_kb(),
        )

    async def cmd_cancel(
        self,
        message: Message,
        state: FSMContext,
    ) -> None:
        await state.clear()

        lang = self.lang_of(message.from_user.id)

        await self._show_main(
            message,
            lang,
        )

    async def cmd_ping(
        self,
        message: Message,
        state: FSMContext,
    ) -> None:
        """بررسی مستقل اتصال به بک‌اند."""

        await state.clear()

        lang = self.lang_of(message.from_user.id)

        ok = await self.client.health()

        await message.answer(
            tr(lang, "backend_ok" if ok else "backend_fail"),
            reply_markup=main_menu_kb(lang),
        )

    async def cmd_link(
        self,
        message: Message,
        state: FSMContext,
    ) -> None:
        await state.clear()
        await message.answer(
            "برای اتصال امن، وارد حساب سایت شوید و در بخش اطلاعات شخصی، "
            "گزینهٔ اتصال تلگرام را بزنید. رمز عبور یا کد ورود خود را اینجا نفرستید.\n"
            + self.cfg.frontend_url + "/account"
        )

    # --------------------------------------------------
    # منوی اصلی و فهرست محصولات
    # --------------------------------------------------

    async def cb_back_main(
        self,
        cb: CallbackQuery,
        state: FSMContext,
    ) -> None:
        await state.clear()

        await cb.answer()

        await self._show_main(
            cb,
            self.lang_of(cb.from_user.id),
        )

    async def cb_noop(
        self,
        cb: CallbackQuery,
    ) -> None:
        await cb.answer()

    async def cb_products(
        self,
        cb: CallbackQuery,
        state: FSMContext,
    ) -> None:
        lang = self.lang_of(cb.from_user.id)
        uid = cb.from_user.id

        await state.clear()
        await cb.answer()

        try:
            products = await self.client.get_products()

        except ApiError as exc:
            await self._answer_api_error(
                cb.message,
                lang,
                exc,
            )
            return

        self._products_cache[uid] = products
        self._compare[uid] = set()

        if not products:
            await self._edit(
                cb.message,
                tr(lang, "products_empty"),
                main_menu_kb(lang),
            )
            return

        await self._show_products_page(
            cb.message,
            lang,
            uid,
            products,
            0,
        )

    async def cb_page(
        self,
        cb: CallbackQuery,
    ) -> None:
        uid = cb.from_user.id
        lang = self.lang_of(uid)

        await cb.answer()

        try:
            page = max(
                0,
                int(cb.data.split(":", 1)[1]),
            )

        except ValueError:
            return

        products = self._products_cache.get(uid)

        if products is None:
            try:
                products = await self.client.get_products()

            except ApiError as exc:
                await self._answer_api_error(
                    cb.message,
                    lang,
                    exc,
                )
                return

            self._products_cache[uid] = products

        pages = max(
            1,
            (len(products) + self.cfg.page_size - 1)
            // self.cfg.page_size,
        )

        await self._show_products_page(
            cb.message,
            lang,
            uid,
            products,
            min(page, pages - 1),
            compare_mode=self._compare_mode[uid],
        )

    async def cb_product(
        self,
        cb: CallbackQuery,
    ) -> None:
        uid = cb.from_user.id
        lang = self.lang_of(uid)

        pid = cb.data.split(":", 1)[1]

        cached = self._products_cache.get(uid, [])
        pid = next((p.id for p in cached if callback_id(p.id) == pid), pid)
        if pid.startswith("~"):
            await cb.answer(tr(lang, "product_not_found"), show_alert=True)
            return

        try:
            # Always refresh price/availability; do not sell from a stale chat cache.
            product = await self.client.get_product(pid, cached=cached)
        except ApiError as exc:
            await cb.answer()
            await self._answer_api_error(cb.message, lang, exc)
            return

        if product is None:
            await cb.answer(
                tr(lang, "product_not_found"),
                show_alert=True,
            )
            return

        await cb.answer()

        details = fmt_details(
            product,
            lang,
            self.cfg.price_suffix,
        )

        if product.image and product.image.startswith("/"):
            product.image = urljoin(self.cfg.frontend_url + "/", product.image)
        if product.image and str(product.image).lower().startswith(
            ("http://", "https://")
        ):
            try:
                await cb.message.answer_photo(
                    product.image,
                    caption=details[:1024],
                    reply_markup=product_kb(lang, pid),
                )
                return

            except Exception:
                logger.info(
                    "نمایش تصویر محصول %s ناموفق بود؛ متن جایگزین شد.",
                    pid,
                )

        await cb.message.answer(
            details,
            reply_markup=product_kb(lang, pid),
        )

    # --------------------------------------------------
    # جست‌وجو
    # --------------------------------------------------

    async def cb_search_start(
        self,
        cb: CallbackQuery,
        state: FSMContext,
    ) -> None:
        lang = self.lang_of(cb.from_user.id)

        await state.set_state(
            SearchStates.waiting_query
        )

        await cb.answer()

        await self._edit(
            cb.message,
            tr(lang, "search_prompt"),
            main_menu_kb(lang),
        )

    async def msg_search(
        self,
        message: Message,
        state: FSMContext,
    ) -> None:
        lang = self.lang_of(message.from_user.id)
        uid = message.from_user.id

        query = (message.text or "").strip()

        await state.clear()

        if len(query) < 2:
            await message.answer(
                tr(lang, "search_short"),
                reply_markup=main_menu_kb(lang),
            )
            return

        try:
            products = await self.client.get_products(
                query=query,
            )

        except ApiError as exc:
            await self._answer_api_error(
                message,
                lang,
                exc,
            )
            return

        self._products_cache[uid] = products

        if not products:
            await message.answer(
                tr(lang, "search_empty").format(q=query),
                reply_markup=main_menu_kb(lang),
            )
            return

        await message.answer(
            tr(lang, "search_result").format(
                q=query,
                count=len(products),
            ),
            reply_markup=products_list_kb(
                products,
                0,
                self.cfg.page_size,
                lang,
            ),
        )

    # --------------------------------------------------
    # مقایسه محصولات
    # --------------------------------------------------

    async def cb_compare_start(
        self,
        cb: CallbackQuery,
        state: FSMContext,
    ) -> None:
        uid = cb.from_user.id
        lang = self.lang_of(uid)

        await state.clear()
        await cb.answer()

        try:
            products = await self.client.get_products()

        except ApiError as exc:
            await self._answer_api_error(
                cb.message,
                lang,
                exc,
            )
            return

        self._products_cache[uid] = products

        await self._show_products_page(
            cb.message,
            lang,
            uid,
            products,
            0,
            compare_mode=True,
        )

    async def cb_compare_toggle(
        self,
        cb: CallbackQuery,
    ) -> None:
        uid = cb.from_user.id
        lang = self.lang_of(uid)

        pid = cb.data.split(
            "cmp:toggle:",
            1,
        )[1]

        selected = self._compare[uid]
        products = self._products_cache.get(uid, [])
        pid = next((p.id for p in products if callback_id(p.id) == pid), pid)
        if not any(p.id == pid for p in products):
            await cb.answer(tr(lang, "product_not_found"), show_alert=True)
            return
        if pid not in selected and len(selected) >= 3:
            await cb.answer("حداکثر سه محصول / Maximum three products", show_alert=True)
            return

        if pid in selected:
            selected.remove(pid)
            added = False
        else:
            selected.add(pid)
            added = True

        products = self._products_cache.get(uid)

        if not products:
            await cb.answer(
                tr(
                    lang,
                    "compare_added" if added else "compare_removed",
                )
            )
            return

        await cb.answer()

        await self._show_products_page(
            cb.message,
            lang,
            uid,
            products,
            self._page.get(uid, 0),
            compare_mode=True,
        )

    async def cb_compare_show(
        self,
        cb: CallbackQuery,
    ) -> None:
        uid = cb.from_user.id
        lang = self.lang_of(uid)

        selected = self._compare.get(uid, set())
        products = self._products_cache.get(uid, [])

        chosen = [
            p for p in products
            if p.id in selected
        ]

        if len(chosen) < 2:
            await cb.answer(
                tr(lang, "compare_need_two"),
                show_alert=True,
            )
            return

        try:
            refreshed = [await self.client.get_product(p.id, cached=products) for p in chosen]
            chosen = [p for p in refreshed if p is not None]
        except ApiError as exc:
            await cb.answer()
            await self._answer_api_error(cb.message, lang, exc)
            return
        if len(chosen) < 2:
            await cb.answer(tr(lang, "compare_need_two"), show_alert=True)
            return

        await cb.answer()

        lines = [
            tr(lang, "compare_title")
        ]

        for i, product in enumerate(chosen, start=1):
            lines.append("")
            lines.append(f"{i}) {product.name}")

            lines.append(
                f"{tr(lang, 'label_price')}: "
                f"{fmt_price(product.price)}"
                f"{self.cfg.price_suffix}"
            )

            lines.append(
                f"{tr(lang, 'label_availability')}: "
                f"{fmt_availability(product, lang)}"
            )

            if product.description:
                lines.append(
                    f"{tr(lang, 'label_description')}: "
                    f"{str(product.description)[:200]}"
                )

        await cb.message.answer(
            "\n".join(lines),
            reply_markup=main_menu_kb(lang),
        )

    async def cb_compare_clear(
        self,
        cb: CallbackQuery,
    ) -> None:
        uid = cb.from_user.id
        lang = self.lang_of(uid)

        self._compare[uid].clear()

        await cb.answer()

        products = self._products_cache.get(uid, [])

        await self._show_products_page(
            cb.message,
            lang,
            uid,
            products,
            self._page.get(uid, 0),
            compare_mode=True,
        )

    # --------------------------------------------------
    # زبان
    # --------------------------------------------------

    async def cb_language(
        self,
        cb: CallbackQuery,
        state: FSMContext,
    ) -> None:
        await state.clear()
        await cb.answer()

        await self._edit(
            cb.message,
            tr("fa", "choose_language"),
            language_kb(),
        )

    async def cb_set_lang(
        self,
        cb: CallbackQuery,
        state: FSMContext,
    ) -> None:
        uid = cb.from_user.id

        code = cb.data.split(":", 1)[1]

        if code not in ("fa", "en"):
            await cb.answer()
            return

        await state.clear()

        self.store.set_lang(uid, code)

        await cb.answer(
            tr(code, "lang_set")
        )

        await self._show_main(
            cb,
            code,
        )

    # --------------------------------------------------
    # پیام‌های دیگر
    # --------------------------------------------------

    async def any_message(
        self,
        message: Message,
        state: FSMContext,
    ) -> None:
        if await state.get_state() is not None:
            return

        if message.from_user is None:
            return

        lang = self.lang_of(
            message.from_user.id
        )

        await message.answer(
            tr(lang, "unknown_input"),
            reply_markup=main_menu_kb(lang),
        )
