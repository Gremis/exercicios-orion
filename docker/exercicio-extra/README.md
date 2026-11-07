# Docker Extra Challenge

## Objective

Run a notes API, PostgreSQL, and pgAdmin together using Docker Compose. Create notes through the API and inspect the same records in the database administration interface.

## Requirements and structure

Docker with Linux containers, Docker Compose, registry access, and free host ports 3000 and 8080 are required. Node.js on the host is not required. Stop other exercises using port 3000 before starting this stack.

```text
docker/exercicio-extra/
  api/
    Dockerfile
    package.json
    package-lock.json
    .dockerignore
    src/index.js
  docker-compose.yml
  .env.example
  README.md
```

The API and dependencies are reused from exercise 2, with the `dev` script added. The package was renamed with npm to `docker-exercise-extra`, and `package-lock.json` was synchronized. The lockfile is included for version control; no generation step is required before building.

The API image uses `node:24-alpine`, installs production dependencies according to the lockfile with `npm ci --omit=dev`, and runs as `node`. Only `api/src` is configured as a read-only bind mount inside the container, with native `node --watch` configured for live reload. Dependencies stay inside the image. Live reload was not specifically tested in this challenge.

PostgreSQL uses `postgres:17-alpine`. pgAdmin uses the numeric release tag `dpage/pgadmin4:9.19.0`, listed with `linux/arm64` support in the [official image tags](https://hub.docker.com/r/dpage/pgadmin4/tags). See the [official container deployment documentation](https://www.pgadmin.org/docs/pgadmin4/9.19/container_deployment.html) for image configuration and the [9.19 release notes](https://www.pgadmin.org/docs/pgadmin4/9.19/release_notes_9_19.html).

## Local configuration

From the repository root:

```sh
cd docker/exercicio-extra
cp .env.example .env
```

Edit this exercise's `.env` locally. All example credentials are fictitious and intended for local development only. Do not copy another exercise's `.env`. Git ignores `.env` and allows `.env.example`.

Compose requires non-empty `DB_USER`, `DB_PASS`, `DB_NAME`, `PGADMIN_DEFAULT_EMAIL`, and `PGADMIN_DEFAULT_PASSWORD`. Database credentials are shared between the API and PostgreSQL configuration. The pgAdmin login is a separate account. PostgreSQL credentials initialize only an empty data volume; editing `.env` does not change an existing database user.

## Build and start

After local configuration, run from the exercise directory:

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs api db pgadmin
```

The API is available at http://localhost:3000 and pgAdmin at http://localhost:8080. Wait until services are ready before testing.

The database healthcheck uses `pg_isready` with its configured user and database. Both API and pgAdmin depend on `db` with `condition: service_healthy`. The API also prepares its `notes` table before starting HTTP. Startup ordering does not guarantee the database will remain available later; `/health` checks the connection with `SELECT 1` on each request.

## Test the API

```sh
curl -i http://localhost:3000/health
curl -i -X POST http://localhost:3000/notes -H 'Content-Type: application/json' -d '{"content":"Visible in pgAdmin"}'
curl -i http://localhost:3000/notes
```

Expect HTTP 200 and `{"status":"ok"}` for health, HTTP 201 with the generated `id` and trimmed `content` for creation, and HTTP 200 with notes ordered by `id` for listing. Record the returned ID. Health returns HTTP 503 and `{"status":"error"}` if the database is unavailable. Missing, non-string, or whitespace-only content returns HTTP 400.

## Register PostgreSQL in pgAdmin

1. Open http://localhost:8080 and sign in with `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD` from your local `.env`.
2. Choose **Register > Server** and enter a display name such as `Notes database`.
3. On the connection tab, set hostname to `db` and port to `5432`.
4. Set the maintenance database to `DB_NAME`, username to `DB_USER`, and password to `DB_PASS` from your local `.env`.
5. Save the server registration. Open the configured database and its Query Tool.

The server connection is registered manually; no server configuration file containing a password is versioned. Use `db`, not `localhost`, because pgAdmin connects over the Compose network.

Run:

```sql
SELECT id, content FROM public.notes ORDER BY id;
```

Confirm that the note created through the API appears with the same ID and `Visible in pgAdmin` content. Create another note through the API and rerun the query to confirm both interfaces use the same database.

## Volumes, network, and persistence

All three services explicitly join `app_network`. Compose scopes it as `orion-docker-extra_app_network`. PostgreSQL has no published host port; only API and pgAdmin ports are bound to the host loopback address.

The named volumes are scoped as `orion-docker-extra_postgres_data` for database records and `orion-docker-extra_pgadmin_data` for pgAdmin configuration. Compose applies these prefixes; no global resource names are set.

To test persistence, first create a distinct note and record its ID:

```sh
curl -i -X POST http://localhost:3000/notes -H 'Content-Type: application/json' -d '{"content":"Persistence check"}'
docker compose down
docker compose up -d
docker compose ps
curl -i http://localhost:3000/health
curl -i http://localhost:3000/notes
```

Wait for readiness and repeat the requests if needed. Confirm the original ID and content remain, then sign in to pgAdmin and query `public.notes` again. Check that the server registration is retained in the pgAdmin volume.

`docker compose down` preserves the named volumes. `docker compose down -v` deletes both volumes, including database records and pgAdmin configuration. Do not use `-v` during the persistence test.

## Status, logs, and shutdown

```sh
docker compose ps
docker compose logs api db pgadmin
docker compose down
docker compose ps -a
```

## Validation checklist

- [x] Create the local `.env` and confirm Git ignores it.
- [x] Rename the package with npm to `docker-exercise-extra` and synchronize the lockfile.
- [x] Validate Compose and whitespace checks.
- [x] Build the API and start `api`, `db`, and `pgadmin`, with PostgreSQL healthy.
- [x] Confirm `/health` returns HTTP 200 with `{"status":"ok"}`.
- [x] Create note 1 through the API with HTTP 201 and content `Extra challenge - API to pgAdmin`.
- [x] Query the same note through the API and SQL in pgAdmin.
- [x] Connect pgAdmin to PostgreSQL using hostname `db`.
- [x] Inspect `app_network` and confirm all three containers are attached.
- [x] Confirm the `postgres_data` and `pgadmin_data` volumes.
- [x] Run `down` followed by `up -d` and confirm the same record remains available.
- [x] Confirm the `Orion Notes` server registration is preserved and rerun the SQL query after recreation.
- [x] Shut down the stack without using `down -v`.
- [ ] Test input validation specifically in this challenge.
- [ ] Test native live reload with a reversible source edit; the bind mount and `node --watch` are configured but this behavior has not been tested here.

## Validation status

The user verified configuration, build, startup, database health, API health, note creation and retrieval, and database access through pgAdmin. Note 1, `Extra challenge - API to pgAdmin`, remained available after stack recreation. The `Orion Notes` registration persisted, and the SQL query was executed again after recreation.

Network inspection confirmed all three containers on `app_network`, and both named volumes were confirmed. The stack was shut down without `down -v`. Live reload is configured through the source bind mount and `node --watch`; it was not specifically tested in this challenge.
