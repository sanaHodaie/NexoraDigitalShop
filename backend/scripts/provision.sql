-- Run with psql as database administrator against the dedicated Nexora database.
-- psql's \password prompts avoid embedding passwords in this script/history.
\set ON_ERROR_STOP on
CREATE ROLE nexora_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE nexora_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\password nexora_migrator
\password nexora_app
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO nexora_migrator WITH GRANT OPTION;
GRANT USAGE ON SCHEMA public TO nexora_app;
-- Run migrations as nexora_migrator, then run grants.sql. New tables deliberately
-- receive no runtime privileges until their access requirements are reviewed.
-- Existing installations must migrate table/sequence ownership from the old owner
-- to nexora_migrator before switching URLs; do not run REASSIGN OWNED blindly.
