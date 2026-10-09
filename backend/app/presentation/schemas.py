import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def normalize_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
        raise ValueError("ایمیل معتبر وارد کنید.")
    return value


class EmailInput(BaseModel):
    email: str
    _email = field_validator("email")(normalize_email)


class Registration(EmailInput):
    password: str = Field(min_length=12, max_length=128)
    full_name: str | None = Field(default=None, alias="fullName", max_length=100)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("نام معتبر وارد کنید.")
        return value


class ResetPassword(BaseModel):
    token: str = Field(min_length=43, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    password: str = Field(min_length=12, max_length=128)


class Login(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)


class GoogleCredential(BaseModel):
    credential: str = Field(min_length=1, max_length=16384)


class QuantityInput(BaseModel):
    quantity: int = Field(strict=True, ge=0, le=99)


class AccountOutput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    email: str
    full_name: str = Field(alias="fullName")
    email_verified_at: datetime | None = Field(default=None, alias="emailVerifiedAt")


class PasswordChange(BaseModel):
    current_password: str = Field(alias="currentPassword", min_length=1, max_length=128)
    new_password: str = Field(alias="newPassword", min_length=12, max_length=128)


class TokenInput(BaseModel):
    token: str = Field(min_length=43, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")


class EmailChange(EmailInput):
    current_password: str = Field(alias="currentPassword", min_length=1, max_length=128)


class PaymentInput(BaseModel):
    reference: str = Field(min_length=1, max_length=160, pattern=r"^[A-Za-z0-9_.:-]+$")


class ProfileUpdate(BaseModel):
    full_name: str = Field(alias="fullName", min_length=1, max_length=100)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("نام معتبر وارد کنید.")
        return value


class OrderOutput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    id: int
    total: float
    status: str
    reservation_expires_at: datetime | None = Field(default=None, alias="reservationExpiresAt")


class OrderHistoryOutput(OrderOutput):
    created_at: datetime = Field(alias="createdAt")
