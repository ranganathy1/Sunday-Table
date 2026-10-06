FROM node:22-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM python:3.13-slim AS backend-build

WORKDIR /build
COPY backend/pyproject.toml ./
COPY backend/app ./app
RUN pip wheel --no-cache-dir --wheel-dir=/wheels .

FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app app

COPY --from=backend-build /wheels /wheels
RUN pip install --no-cache-dir /wheels/* \
    && rm -rf /wheels

COPY --chown=app:app backend/alembic.ini ./alembic.ini
COPY --chown=app:app backend/migrations ./migrations
COPY --chown=app:app backend/scripts ./scripts
COPY --chown=app:app backend/seed.sql backend/schema.sql ./
COPY --from=frontend-build --chown=app:app /frontend/dist ./frontend_dist

USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
