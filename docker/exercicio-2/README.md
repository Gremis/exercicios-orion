# Docker Exercise 2

## Objective

Run an Express notes API with PostgreSQL using Docker Compose, environment variables, and a named volume. The API uses a connection pool and prepares the `notes` table before listening on `0.0.0.0:3000`.

## Requirements

- Docker with Linux containers and Docker Compose.
- Access to Docker Hub and the npm registry.
- Host port 3000 available; stop exercise 1 if it is using this port.

Node.js on the host is not required. The API uses `node:24-alpine`, and the database uses `postgres:17-alpine`.

## Local configuration

From the repository root:

```sh
cd docker/exercicio-2
cp .env.example .env
```

Edit `.env` for local development. The example password is fictitious and intended only for development. Git ignores `.env` and allows `.env.example`.

Compose requires non-empty `DB_USER`, `DB_PASS`, and `DB_NAME`. It maps these to the API settings and to `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. The API connects to `db:5432` inside the Compose network. PostgreSQL has no published host port.

The database initializes its user, password, and database when the data volume is empty. Changing `.env` later does not update credentials in an existing database volume.

## Build and start

The project includes `package-lock.json` for version control. During the build, the Dockerfile copies both manifests first and uses `npm ci --omit=dev` to install production dependencies according to that lockfile.

From the exercise directory, after configuring `.env`:

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs api db
```

Compose waits for the database healthcheck before starting the API. The API creates `notes` automatically and starts HTTP only after initialization succeeds. An initialization failure produces a generic log message and a nonzero exit code.

## Verify the API

The API is available at http://localhost:3000.

```sh
curl -i http://localhost:3000/health
curl -i -X POST http://localhost:3000/notes -H 'Content-Type: application/json' -d '{"content":"My first note"}'
curl -i http://localhost:3000/notes
```

Expected results:

- Health: HTTP 200 with `{"status":"ok"}` when the database is available; HTTP 503 with `{"status":"error"}` when unavailable.
- Creation: HTTP 201 with the database-generated integer `id` and trimmed `content`, for example `{"id":1,"content":"My first note"}` on a fresh database.
- Listing: HTTP 200 with an array of notes ordered by `id`.
- Missing, non-string, or whitespace-only content: HTTP 400. Database failures return a generic error without SQL, credentials, or stack traces.

## Verify persistence

With the application running, insert a distinct note and record its returned ID:

```sh
curl -i -X POST http://localhost:3000/notes -H 'Content-Type: application/json' -d '{"content":"Persistence check"}'
docker compose down
docker compose up -d
docker compose ps
curl -i http://localhost:3000/health
curl -i http://localhost:3000/notes
```

Wait until the API is ready if necessary, then confirm the same ID and content remain in the listing. `docker compose down` preserves the named `postgres_data` volume. `docker compose down -v` deletes the volume and its data; do not use it during the persistence test.

## Logs and shutdown

```sh
docker compose ps
docker compose logs api db
docker compose down
docker compose ps -a
```

## Validation checklist

- [x] Create the local `.env` from `.env.example` and confirm Git ignores it.
- [x] Generate `package-lock.json` with npm in a temporary container.
- [x] Validate Compose, JavaScript syntax, and whitespace checks.
- [x] Build the API and confirm PostgreSQL is healthy and the API is running.
- [x] Confirm `/health` returns HTTP 200 with `{"status":"ok"}`.
- [x] Create notes with HTTP 201 and list stored records ordered by `id`.
- [x] Confirm records 1 and 2 persist after `docker compose down` and `docker compose up -d`.
- [x] Confirm whitespace-only, numeric, and missing content return HTTP 400.
- [x] Confirm `"  Trim validation  "` is stored as `"Trim validation"` with ID 3.
- [x] Stop the database and confirm `/health` returns HTTP 503 with `{"status":"error"}`.
- [x] Restart the database and confirm `/health` returns HTTP 200 without restarting the API, with records 1, 2, and 3 still present.
- [x] Inspect logs and confirm final shutdown removes containers and the network, leaving `docker compose ps -a` empty.
- [x] Record a video of the persistence test.

## Validation status

The user verified configuration, syntax, build, database connectivity, note creation and listing, input validation, trimming, and persistence in the terminal. Database unavailability produced HTTP 503; after restarting the database, health returned to HTTP 200 without an API restart, and all three records remained present. Logs were inspected, and final shutdown left no containers in `docker compose ps -a`.

The persistence test video was recorded and will be attached to the pull request.
