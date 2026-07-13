# syntax=docker/dockerfile:1.7

ARG PYTHON_IMAGE=python:3.12-slim-bookworm
ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.11.6

FROM ${UV_IMAGE} AS uv

FROM ${PYTHON_IMAGE} AS build
COPY --from=uv /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
WORKDIR /srv/runtime
COPY apps/agent-runtime/pyproject.toml apps/agent-runtime/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project
COPY apps/agent-runtime/app app
RUN /opt/venv/bin/python -m compileall -q app

FROM ${PYTHON_IMAGE} AS runtime
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH=/opt/venv/bin:${PATH}
ENV RUNTIME_BODY_LIMIT_BYTES=1048576
ENV RUNTIME_LOG_LEVEL=INFO
RUN groupadd --system --gid 10001 runtime \
    && useradd --system --uid 10001 --gid runtime --home-dir /srv/runtime runtime
WORKDIR /srv/runtime
COPY --from=build --chown=runtime:runtime /opt/venv /opt/venv
COPY --from=build --chown=runtime:runtime /srv/runtime/app app
USER runtime
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/live', timeout=3)"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
