.PHONY: setup up down logs

setup:
	test -f .env || cp .env.example .env

up:
	docker compose up -d --wait

down:
	docker compose down

logs:
	docker compose logs -f
