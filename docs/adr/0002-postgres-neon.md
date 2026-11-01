# 0002. PostgreSQL on Neon

Status: accepted

## Context
We need a reliable relational store with `citext`, `pgcrypto` and later full-text search, running on Vercel's serverless model.

## Decision
PostgreSQL 18, hosted on Neon through the Vercel Marketplace. SQLAlchemy 2.x (async) with `NullPool` against the pooled endpoint; Alembic uses the direct (unpooled) URL. Each preview deployment gets a Neon database branch. Separate roles: `app_migrator` (DDL) and `app_runtime` (DML only).

## Consequences
- Point-in-time recovery and branching come with the provider; a nightly `pg_dump` adds an independent backup.
- Serverless connections rely on the pooler, so timeouts stay short.
- Migrations must be backward compatible (expand, migrate, contract) so app rollbacks are safe.
