# Archived ASP.NET backend

`Nexora.Api` is retained as a reference and to preserve local SQLite data.
It is not part of the Python application, Docker build, or current deployment.
Use `backend/app`, PostgreSQL and Alembic for all new development.

The PostgreSQL schema, Argon2 password hashes and server-side sessions are new.
There is no automatic import of the old SQLite data or ASP.NET cookies.
