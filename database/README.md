# Database

`schema.sql` contains the initial PostgreSQL domain model. Add timestamped migration files under `migrations/` when the API is implemented.

The Raspberry Pi should never connect directly to PostgreSQL. It should use the authenticated API.
