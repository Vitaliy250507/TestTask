FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app


COPY pyproject.toml uv.lock /app/

RUN uv pip install --system --no-cache -r pyproject.toml

COPY . /app/