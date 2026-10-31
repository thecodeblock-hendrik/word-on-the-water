-- Least-privilege roles on Neon, mirroring docker/postgres/init.sql. Run once, as the Neon owner,
-- on the main branch (preview branches copy its roles). See docs/runbooks/deploy.md.
--   psql "$NEON_DATABASE_URL_UNPOOLED" -v migrator_password=... -v runtime_password=... -f db/neon_roles.sql
\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE ROLE app_migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE app_runtime LOGIN PASSWORD :'runtime_password';

-- Postgres 16+: the owner must be a member of app_migrator to hand it the schema.
GRANT app_migrator TO CURRENT_USER;
ALTER SCHEMA public OWNER TO app_migrator;
GRANT USAGE ON SCHEMA public TO app_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
