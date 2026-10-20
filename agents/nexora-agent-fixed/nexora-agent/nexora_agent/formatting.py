_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def persian_digits(value) -> str:
    return str(value).translate(_DIGITS)


def rial(amount: float, rate: int) -> int:
    """Convert the stored base price to the rial amount the storefront shows."""
    return round((amount or 0) * rate)


def rial_text(amount: float, rate: int) -> str:
    """Same output as ShopContext.formatPrice: Persian digits, comma separators."""
    return f"{persian_digits(f'{rial(amount, rate):,}')} ریال"
