.PHONY: setup up down logs

setup:
	test -f .env || cp .env.example .env

up:
	docker compose up -d --wait

down:
	docker compose down

logs:
	docker compose logs -f

.PHONY: lint typecheck test

lint:
	cd apps/api && uv run ruff check . && uv run ruff format --check .

typecheck:
	cd apps/api && uv run mypy app tests

test:
	cd apps/api && uv run pytest

.PHONY: migrate

migrate:
	cd apps/api && uv run --env-file ../../.env alembic upgrade head
