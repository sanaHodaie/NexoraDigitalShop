from decimal import Decimal
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.management import CATEGORY_IDS


def image_path(value):
    import re
    if re.fullmatch(r'/api/media/[a-f0-9]{64}\.webp', value):
        return value
    # Only files served by this storefront; no tracking pixels, data URLs or external SVGs.
    if not value.startswith('/assets/') or '..' in value or '\\' in value or any(c in value for c in '?#%'):
        raise ValueError('Use a local /assets/ image path')
    if not value.lower().endswith(('.webp', '.png', '.jpg', '.jpeg', '.svg')):
        raise ValueError('Unsupported image path')
    return value


def category(value):
    if value not in CATEGORY_IDS:
        raise ValueError('Unknown category')
    return value


Text = Annotated[str, Field(max_length=5000)]
Image = Annotated[str, Field(max_length=300), AfterValidator(image_path)]
Category = Annotated[str, AfterValidator(category)]
Identifier = Annotated[str, Field(pattern=r'^[a-z0-9][a-z0-9-]{0,79}$')]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class ProductInput(StrictModel):
    id: Identifier
    name: str = Field(min_length=1, max_length=200)
    nameEn: str = Field(min_length=1, max_length=200)
    category: Category
    categoryFa: str = Field(max_length=100)
    brand: str = Field(max_length=100)
    price: Decimal | None = Field(default=None, ge=0, le=1000000, max_digits=19, decimal_places=12, allow_inf_nan=False)
    priceRial: int | None = Field(default=None, strict=True, ge=0, le=600000000000)
    stock: int = Field(strict=True, ge=0, le=1000000)
    expectedStock: int | None = Field(default=None, ge=0)
    isActive: bool = True
    image: Image
    description: Text
    specs: list[Annotated[str, Field(max_length=250)]] = Field(max_length=20)
    badge: str = Field(default='', max_length=50)

    @model_validator(mode='after')
    def resolve_price(self):
        if self.isActive and self.image == '/assets/products/product-pending.svg':
            raise ValueError('Upload a product image before publishing')
        if (self.price is None) == (self.priceRial is None):
            raise ValueError('Provide exactly one price')
        if self.priceRial is not None:
            self.price = (Decimal(self.priceRial) / Decimal(600000)).quantize(Decimal('0.000000000001'))
        return self


class BulkPriceInput(StrictModel):
    category: Category
    brand: str | None = Field(default=None, min_length=1, max_length=100)
    percent: Decimal = Field(gt=0, le=100, max_digits=5, decimal_places=2, allow_inf_nan=False)
    snapshot: str | None = Field(default=None, pattern=r'^[a-f0-9]{64}$')


class Source(StrictModel):
    label: str = Field(max_length=300)
    url: str = Field(max_length=1000)

    @field_validator('url')
    @classmethod
    def safe_url(cls, value):
        parsed = urlsplit(value)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('HTTPS source required')
        return value


class ArticleSection(StrictModel):
    id: Identifier
    title: Text
    paragraphs: list[Text] = Field(min_length=1, max_length=20)
    sources: list[Source] = Field(default_factory=list, max_length=10)
    image: Image | None = None
    imageAlt: Text = ''
    contain: bool = False
    caption: Text = ''


class ArticleBody(StrictModel):
    intro: Text
    takeaway: Text
    sections: list[ArticleSection] = Field(min_length=1, max_length=20)
    checklist: list[Text] = Field(max_length=20)

    @model_validator(mode='after')
    def unique_sections(self):
        ids = [s.id for s in self.sections]
        if len(ids) != len(set(ids)) or 'checklist' in ids:
            raise ValueError('Section anchors must be unique')
        return self


class ArticleMetadata(StrictModel):
    id: Identifier
    slug: Identifier
    tag: str = Field(max_length=80)
    tagColor: str = Field(default='bg-blue-600', pattern=r'^bg-(blue|emerald|amber|purple)-600$')
    title: str = Field(min_length=1, max_length=300)
    excerpt: Text
    readTime: str = Field(max_length=100)
    image: Image
    imageAlt: Text
    date: str = Field(max_length=100)
    published: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    category: Category


class Article(StrictModel):
    published: bool = True
    metadata: ArticleMetadata
    content: ArticleBody


class Articles(StrictModel):
    items: list[Article] = Field(max_length=100)

    @model_validator(mode='after')
    def unique_articles(self):
        for field in ('id', 'slug'):
            values = [getattr(a.metadata, field) for a in self.items]
            if len(set(values)) != len(values):
                raise ValueError('Duplicate article')
        return self


class CategoryContent(StrictModel):
    id: Category
    title: str = Field(min_length=1, max_length=100)
    english: str = Field(max_length=100)
    description: Text
    image: Image
    thumbnail: Image


class Categories(StrictModel):
    items: list[CategoryContent] = Field(min_length=10, max_length=10)

    @model_validator(mode='after')
    def existing_categories(self):
        if {c.id for c in self.items} != CATEGORY_IDS:
            raise ValueError('Keep all supported categories')
        return self


class Hero(StrictModel):
    title: Text
    accent: Text
    description: Text
    image: Image


class Collection(StrictModel):
    id: Identifier
    title: Text
    subtitle: Text
    image: Image
    link: str = Field(pattern=r'^#[a-z-]+$')

    @field_validator('link')
    @classmethod
    def known_link(cls, value):
        category(value[1:])
        return value


class HomeContent(StrictModel):
    hero: Hero
    collections: list[Collection] = Field(max_length=10)
    trendingIds: list[Identifier] = Field(max_length=20)
    recommendedIds: list[Identifier] = Field(max_length=20)
    dealIds: list[Identifier] = Field(max_length=20)


class SettingsContent(StrictModel):
    storeName: str = Field(min_length=1, max_length=100)
    description: Text
    supportEmail: str = Field(max_length=254)
    supportPhone: str = Field(max_length=40)


class DocumentInput(StrictModel):
    version: int = Field(ge=1)
    data: dict


DOCUMENT_MODELS = {'categories': Categories, 'articles': Articles, 'home': HomeContent, 'settings': SettingsContent}
