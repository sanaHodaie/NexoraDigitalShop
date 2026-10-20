"""Catalogue-grounded advice. No ORM, provider SDK, network or model-written facts."""

import re
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from app.domain.entities import FREE_SHIPPING_THRESHOLD, SHIPPING_FEE

RIAL_RATE = Decimal("600000")  # Same storefront display conversion as src/lib/money.js.
CATEGORIES = {
    "smartphones": ("گوشی", "موبایل", "smartphone", "iphone", "آیفون"),
    "laptops": ("لپ تاپ", "لپتاپ", "پی سی", "کامپیوتر", "laptop", "macbook", "مک بوک"),
    "audio": ("هدفون", "هندزفری", "ایرپاد", "صوتی", "اسپیکر", "headphone", "airpod"),
    "gaming": ("کنسول", "گیمینگ", "پلی استیشن", "ایکس باکس", "console"),
    "smart-home": ("خانه هوشمند", "دوربین هوشمند", "پریز هوشمند", "tapo"),
    "wearables": ("پوشیدنی", "ساعت", "واچ", "watch"),
    "accessories": ("لوازم جانبی", "شارژر", "کابل", "اس اس دی", "پاوربانک"),
    "cameras": ("دوربین", "لنز", "camera", "lens"),
    "drones": ("پهپاد", "پهباد", "کوادکوپتر", "drone"),
    "more": ("سایر", "روتر", "مودم", "مانیتور", "پروژکتور", "میکروفون", "وبکم", "پرینتر", "کتاب خوان"),
}
LABELS = dict(
    zip(
        CATEGORIES,
        [
            "گوشی هوشمند",
            "لپ‌تاپ و پی‌سی",
            "تجهیزات صوتی",
            "گیمینگ و کنسول",
            "خانه هوشمند",
            "پوشیدنی‌ها",
            "لوازم جانبی",
            "دوربین و لنز",
            "پهپاد",
            "سایر دسته‌ها",
        ],
    )
)


def normalize(value):
    return re.sub(
        r"\s+",
        " ",
        str(value)
        .translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩يك", "01234567890123456789یک"))
        .replace("\u200c", " ")
        .replace("٬", "")
        .replace(",", "")
        .replace("٫", ".")
        .casefold(),
    ).strip()


def rial(price):
    return int((Decimal(str(price)) * RIAL_RATE).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


@dataclass
class Plan:
    category: str | None = None
    use_case: str = "general"
    device: str = "any"
    queries: list[str] = field(default_factory=list)
    max_rial: int | None = None
    min_ram: int | None = None
    intent: str = "recommend"
    sort: str = "price_asc"
    clarify_budget: bool = False


def local_plan(messages):
    """Conservative fallback; only user turns supply context, never claimed assistant facts."""
    plan = Plan()
    for message in messages:
        text = normalize(message)
        matches = [(len(word), cat) for cat, words in CATEGORIES.items() for word in words if word in text]
        if matches:
            category = max(matches)[1]
            # "Gaming headphones" and "phone with a good camera" describe a use case,
            # not a request to switch to consoles or standalone cameras.
            matched_categories = {cat for _, cat in matches}
            if category == "gaming" and len(matched_categories) > 1:
                category = max((size, cat) for size, cat in matches if cat != "gaming")[1]
            if category == "cameras" and "smartphones" in matched_categories:
                category = "smartphones"
            if category != plan.category:
                plan = Plan(category=category)
            plan.category = category
        brands = {
            "apple": ("اپل", "apple"),
            "samsung": ("سامسونگ", "samsung"),
            "lenovo": ("لنوو", "lenovo"),
            "asus": ("ایسوس", "asus"),
            "sony": ("سونی", "sony"),
            "xiaomi": ("شیائومی", "xiaomi"),
            "logitech": ("لاجیتک", "لاجیک", "logitech"),
            "dell": ("دل", "dell"),
            "acer": ("ایسر", "acer"),
            "tp-link": ("تی پی لینک", "tp-link"),
        }
        mentioned = [
            brand
            for brand, aliases in brands.items()
            if any(re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", text) for alias in aliases)
        ]
        if mentioned:
            plan.queries = mentioned
        if any(w in text for w in ("برنامه نویسی", "برنامهنویسی", "کدنویسی", "programming", "coding")):
            plan.category, plan.use_case = "laptops", "programming"
        if any(w in text for w in ("android studio", "اندروید استودیو", "شبیه ساز")):
            plan.category, plan.use_case = "laptops", "android"
        if any(w in text for w in ("docker", "داکر", "ماشین مجازی", "یادگیری ماشین")):
            plan.category, plan.use_case = "laptops", "heavy"
        if any(w in text for w in ("ios", "xcode", "توسعه آیفون")):
            plan.category, plan.use_case = "laptops", "ios"
        if any(w in text for w in ("لپ تاپ", "لپتاپ", "laptop", "macbook")):
            plan.device = "laptop"
        elif any(w in text for w in ("دسکتاپ", "پی سی", "desktop", "کامپیوتر رومیزی")):
            plan.device = "desktop"
        if "گران" in text:
            plan.sort = "price_desc"
        if "ارزان" in text:
            plan.sort = "price_asc"
        ram = re.search(r"(?:رم|ram)\s*(\d{1,3})", text)
        if ram:
            plan.min_ram = min(int(ram[1]), 256)
        budget = re.search(r"(\d+(?:[.,]\d+)?)\s*(میلیون|میلیارد|هزار)?\s*(تومان|تومن|ریال)", text)
        ambiguous = re.search(r"(?:بودجه|تا|حداکثر)\s*(\d+(?:\.\d+)?)\s*(میلیون|میلیارد|هزار)?", text)
        if budget:
            number = Decimal(budget[1].replace(",", ""))
            scale = {"میلیون": 1000000, "میلیارد": 1000000000, "هزار": 1000}.get(budget[2], 1)
            plan.max_rial = int(number * scale * (10 if budget[3] != "ریال" else 1))
            plan.clarify_budget = False
        elif ambiguous:
            plan.clarify_budget = True
        if any(w in text for w in ("ارسال", "هزینه پست", "shipping")):
            plan.intent = "shipping"
        elif any(w in text for w in ("مقایسه", "compare")):
            plan.intent = "compare"
        elif any(w in text for w in ("قیمت", "مشخصات", "موجوده", "موجود هست")):
            plan.intent = "details"
        else:
            plan.intent = "recommend"
    return plan


def specs(product):
    value = product.payload.get("specs")
    return [s[:300] for s in value if isinstance(s, str)][:16] if isinstance(value, list) else []


def hardware(product):
    ram, storage = None, None
    for spec in specs(product):
        text = normalize(spec)
        if "رم" in text or "ram" in text:
            match = re.search(r"(\d+)\s*(?:گیگ|gb)", text)
            if match:
                ram = int(match[1])
        if "ssd" in text:
            match = re.search(r"(\d+)\s*(ترابایت|tb|گیگابایت|gb)", text)
            if match:
                storage = int(match[1]) * (1024 if match[2] in ("ترابایت", "tb") else 1)
    return ram, storage


def device_type(product):
    text = normalize(product.name + " " + product.name_en)
    if any(
        w in text
        for w in (
            "لپ تاپ",
            "لپتاپ",
            "laptop",
            "macbook",
            "vivobook",
            "ideapad",
            "aspire",
            "victus",
            "inspiron",
            "lenovo loq",
        )
    ):
        return "laptop"
    if any(w in text for w in ("mac mini", "imac", "دسکتاپ", "رومیزی", "desktop")):
        return "desktop"
    return "other"


def match_query(product, query):
    text = normalize(
        product.id
        + " "
        + product.name
        + " "
        + product.name_en
        + " "
        + str(product.payload.get("brand") or "")
    )
    tokens = normalize(query).split()
    return bool(tokens) and all(token in text for token in tokens)


def named_products(products, messages):
    text = normalize(" ".join(messages[-3:]))
    # Exact SKU or complete English model name, or distinctive model suffix.
    found = []
    for p in products:
        english = normalize(p.name_en)
        candidates = [normalize(p.id), normalize(p.name), english]
        suffix = english.split()[-1:]  # C200, AX55, CTL-472, etc.; never generic size/colour.
        if suffix and re.search(r"[a-z].*\d|\d.*[a-z]", suffix[0]) and len(suffix[0]) >= 4:
            candidates += suffix
        if any(
            len(name) >= 4 and re.search(r"(?<![\w-])" + re.escape(name) + r"(?![\w-])", text)
            for name in candidates
        ):
            found.append(p)
    return found


GUIDANCE = {
    "programming": "برای یادگیری و توسعهٔ وب، پیشنهاد عمومی ما رم ۱۶ گیگابایت و SSD حداقل ۵۱۲ گیگابایت است؛ این حداقل قطعی همهٔ ابزارها نیست. پردازندهٔ جدید چند‌هسته‌ای، صفحه‌نمایش خوانا و سازگاری سیستم‌عامل با ابزارها را هم بررسی کن.",
    "android": "برای Android Studio همراه شبیه‌ساز، رم ۱۶ گیگابایت حداقل اعلام‌شدهٔ ابزار است و ۳۲ گیگابایت توصیه می‌شود. پشتیبانی مجازی‌سازی پردازنده و فضای SSD را پیش از خرید بررسی کن؛ مشخصات ناقص کاتالوگ تأیید سازگاری نیست.",
    "heavy": "برای چند کانتینر، ماشین مجازی یا پروژه‌های سنگین، پیشنهاد محافظه‌کارانهٔ ما رم ۳۲ گیگابایت و SSD حداقل ۵۱۲ گیگابایت است. برای یادگیری ماشین، نیاز GPU به مدل و حجم داده بستگی دارد؛ از روی نام لپ‌تاپ نمی‌توان تضمین داد.",
    "ios": "برای توسعه با Xcode باید مک و نسخهٔ سازگار macOS داشته باشی. پیشنهاد عمومی ما رم ۱۶ گیگابایت و SSD حداقل ۵۱۲ گیگابایت است؛ نسخهٔ سیستم‌عامل و ابزار را قبل از خرید بررسی کن.",
}


def answer(products, plan, messages, limit=3):
    if plan.intent == "shipping":
        numbers = str.maketrans("0123456789,", "۰۱۲۳۴۵۶۷۸۹٬")
        threshold = f"{rial(FREE_SHIPPING_THRESHOLD):,}".translate(numbers)
        fee = f"{rial(SHIPPING_FEE):,}".translate(numbers)
        return {
            "text": f"طبق محاسبهٔ فعلی فروشگاه، ارسال برای جمع کالاهای حداقل {threshold} ریال رایگان است؛ پایین‌تر از آن هزینهٔ ارسال {fee} ریال است. مبلغ نهایی در ثبت سفارش دوباره محاسبه می‌شود.",
            "products": [],
        }
    if plan.clarify_budget:
        return {
            "text": "بودجه را با واحد مشخص بنویس؛ مثلاً «تا ۵۰ میلیون تومان» یا «۵۰۰ میلیون ریال».",
            "products": [],
        }
    selected = named_products(products, messages[-1:])
    if (
        not selected
        and plan.intent in ("details", "compare")
        and any(
            word in normalize(messages[-1] if messages else "") for word in ("این", "اون", "مشخصاتش", "قیمتش")
        )
    ):
        selected = named_products(products, messages[-3:])
    if plan.queries and (not selected or (plan.intent == "compare" and len(selected) < 2)):
        groups = [[p for p in products if match_query(p, q)] for q in plan.queries]
        if plan.intent == "compare" and any(len(group) != 1 for group in groups):
            selected = []  # A brand name cannot identify an individual comparison model.
        else:
            selected = list({p.id: p for group in groups for p in group}.values())
    explicit = bool(selected) and plan.intent in ("compare", "details")
    candidates = selected if selected or plan.queries else products
    if not plan.category and not selected and not plan.queries:
        return {
            "text": "برای انتخاب محصول کمک می‌کنم. نوع محصول، کاربرد و بودجه‌ات را بگو؛ مثلاً «لپ‌تاپ برای برنامه‌نویسی تا ۵۰ میلیون تومان». دسته‌های فروشگاه: "
            + "، ".join(LABELS.values()),
            "products": [],
        }
    if plan.intent == "compare" and len(selected) < 2:
        return {
            "text": "نام دقیق یا شناسهٔ دو محصول فروشگاه را بنویس تا مشخصات ثبت‌شده‌شان را کنار هم ببینیم.",
            "products": [],
        }
    required_ram = max(
        plan.min_ram or 0, 32 if plan.use_case == "heavy" else 16 if plan.use_case in GUIDANCE else 0
    )
    eligible = []
    for p in candidates:
        if not explicit and plan.category and p.category != plan.category:
            continue
        if not explicit and p.stock <= 0:
            continue
        if plan.max_rial is not None and rial(p.price) > plan.max_rial:
            continue
        if not explicit:
            if plan.device != "any" and device_type(p) != plan.device:
                continue
            ram, storage = hardware(p)
            if required_ram and (ram is None or ram < required_ram):
                continue
            if plan.use_case in GUIDANCE:
                if device_type(p) == "other" or storage is None or storage < 512:
                    continue
                if plan.use_case == "ios" and "apple" not in normalize(p.name_en):
                    continue
        eligible.append(p)
    eligible.sort(key=lambda p: (p.price, p.id), reverse=plan.sort == "price_desc")
    chosen = eligible[:limit]
    intro = GUIDANCE.get(plan.use_case, "")
    if not chosen:
        return {
            "text": (intro + "\n\n" if intro else "")
            + "در محصولات فعال فروشگاه گزینه‌ای با موجودی و مشخصات ثبت‌شدهٔ مطابق این درخواست پیدا نشد. بودجه یا مدل دیگری را مشخص کن؛ مشخصات ثبت‌نشده را حدس نمی‌زنم.",
            "products": [],
        }
    text = (intro + "\n\n" if intro else "") + (
        "مقایسه بر اساس مشخصات ثبت‌شدهٔ فروشگاه:"
        if plan.intent == "compare"
        else "این گزینه‌ها را بر اساس داده‌های فعلی فروشگاه پیدا کردم:"
    )
    cards = []
    for p in chosen:
        card = {
            **p.public(),
            "id": p.id,
            "name": p.name,
            "nameEn": p.name_en,
            "category": p.category,
            "specs": specs(p),
            "priceRial": rial(p.price),
        }
        cards.append(card)
    text += "\nقیمت و موجودی هنگام ثبت سفارش دوباره بررسی می‌شوند."
    if plan.use_case in GUIDANCE:
        text += "\nاین انتخاب بر اساس رم و SSD ثبت‌شده است؛ توان پردازنده، قابلیت ارتقا و سازگاری نرم‌افزار نیاز به بررسی دقیق مدل دارد. نوع برنامه‌نویسی و بودجه‌ات را بگو تا دقیق‌تر انتخاب کنیم."
    return {"text": text, "products": cards}
