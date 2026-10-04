FROM python:3.13-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_INDEX_URL=https://pypi.iranrepo.ir/simple \
    PIP_INDEX_URL=https://pypi.iranrepo.ir/simple \
    PIP_TRUSTED_HOST=pypi.iranrepo.ir \
    PIP_DEFAULT_TIMEOUT=180 \
    UV_HTTP_TIMEOUT=180
RUN pip install --no-cache-dir uv==0.11.27
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY alembic ./alembic
COPY data ./data
COPY alembic.ini start.py ./
RUN useradd --uid 10001 --create-home appuser
USER appuser
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["python", "start.py"]