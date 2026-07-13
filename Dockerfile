FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app


COPY pyproject.toml uv.lock /app/

RUN uv pip install --system --no-cache -r pyproject.toml
RUN uv pip install --system whitenoise
COPY . /app/

EXPOSE 8000

CMD python manage.py migrate && daphne -b 0.0.0.0 -p 8000 config.asgi:application