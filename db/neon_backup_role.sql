-- Read-only login role for the nightly dump (.github/workflows/backup.yml). Run once, as the Neon
-- owner, on the main branch only (previews never get it). Created 2026-11-01.
--   psql "$NEON_DATABASE_URL_UNPOOLED" -v backup_password=... -f db/neon_backup_role.sql
-- Its URL (direct host, sslmode=verify-full&sslrootcert=system) is BACKUP_DATABASE_URL in the
-- GitHub environment `backup`. Created with SQL, not the Neon Roles page: roles made there join
-- neon_superuser, which would defeat the point.
\set ON_ERROR_STOP on

CREATE ROLE app_backup LOGIN PASSWORD :'backup_password';
ALTER ROLE app_backup SET default_transaction_read_only = on;

GRANT CONNECT ON DATABASE neondb TO app_backup;
GRANT USAGE ON SCHEMA public TO app_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO app_backup;

-- Tables that migrations create later are readable too.
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
    GRANT SELECT ON TABLES TO app_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
    GRANT SELECT ON SEQUENCES TO app_backup;
