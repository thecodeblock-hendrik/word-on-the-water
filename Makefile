.PHONY: setup up down logs

setup:
	uv run scripts/setup_env.py .env.example .env

up:
	docker compose up -d --wait

down:
	docker compose down

logs:
	docker compose logs -f

.PHONY: lint typecheck test e2e

lint:
	cd apps/api && uv run ruff check . && uv run ruff format --check .
	pnpm --dir apps/web lint && pnpm --dir apps/web format:check

typecheck:
	cd apps/api && uv run mypy app tests
	pnpm --dir apps/web typecheck

test:
	cd apps/api && uv run pytest
	pnpm --dir apps/web test

.PHONY: migrate

migrate:
	cd apps/api && uv run --env-file ../../.env alembic upgrade head

e2e:
	pnpm --dir apps/web e2e
