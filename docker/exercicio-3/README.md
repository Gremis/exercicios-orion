# Docker Exercise 3

## Objective

Run the notes API from exercise 2 in independent development and production environments. The API behavior is unchanged: pooled PostgreSQL connections, automatic table initialization before HTTP startup, database health checks, validated note creation, and listing ordered by ID.

## Requirements and setup

Docker with Linux containers, Docker Compose, registry access, and available host ports 3001 and 3002 are required. Node.js on the host is not required.

From the repository root:

```sh
cd docker/exercicio-3
cp .env.example .env
```

Edit the local `.env` as needed. Its password is fictitious and intended only for local development. Do not copy another exercise's `.env`. Git ignores `.env` and allows `.env.example`.

Both Compose files require `DB_USER`, `DB_PASS`, and `DB_NAME`, mapping them to the API and PostgreSQL credentials. The API connects to `db:5432` within its own network. The database has no published host port. Credentials initialize only an empty database volume; changing `.env` does not update an existing database user.

The manifests and lockfile are reused from exercise 2, with only the `dev` script added. Dependencies are unchanged. The Dockerfile installs production dependencies with `npm ci --omit=dev` before copying source code. Development uses native `node --watch`; production uses a clean `node:24-alpine` stage with only the application manifests, production dependencies, and source added. Production sets `NODE_ENV=production`. Both runtime stages use `USER node`.

## Build and start

Run all remaining commands from the exercise directory.

Development:

```sh
docker compose -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs api db
```

Production:

```sh
docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api db
```

Development is available at http://localhost:3001 and production at http://localhost:3002. Each API waits for its database healthcheck and prepares the table before listening. Wait for readiness before sending requests.

## Test the API

Development:

```sh
curl -i http://localhost:3001/health
curl -i -X POST http://localhost:3001/notes -H 'Content-Type: application/json' -d '{"content":"Development only"}'
curl -i http://localhost:3001/notes
```

Production:

```sh
curl -i http://localhost:3002/health
curl -i -X POST http://localhost:3002/notes -H 'Content-Type: application/json' -d '{"content":"Production only"}'
curl -i http://localhost:3002/notes
```

Expect HTTP 200 with `{"status":"ok"}` for health, HTTP 201 with `id` and trimmed `content` for creation, and HTTP 200 with an array ordered by ID for listing. Invalid content returns HTTP 400. Database unavailability returns HTTP 503 from health with `{"status":"error"}`.

## Demonstrate live reload and source isolation

First build and start both environments using the original source. In `src/index.js`, temporarily change only the successful health response from `response.status(200).json({ status: 'ok' });` to `response.status(200).json({ status: 'ok', reload: true });` and save the file.

Development mounts only `./src` at `/app/src` as read-only inside the container. Dependencies remain in the image. Node's watch mode should restart the development process after the host edit. Inspect the logs and retry health after the restart:

```sh
docker compose -f docker-compose.dev.yml logs api
curl -i http://localhost:3001/health
curl -i http://localhost:3002/health
```

Expect the temporary `reload` field only in development. Production continues to return the original response because it uses source copied during its build and has no source or dependency bind mount. Do not rebuild production during this demonstration.

Restore the original health response and save the file. Confirm development reloads again and both health endpoints return the original response. Leave no temporary source changes behind.

## Demonstrate data isolation and persistence

After creating the distinct notes above, query both environments. Confirm `Development only` exists only in development and `Production only` only in production. Existing records from earlier runs may also be present.

The project names `orion-ex3-dev` and `orion-ex3-prod` scope their default networks and named volumes separately. The volumes are `orion-ex3-dev_postgres_data` and `orion-ex3-prod_postgres_data`. Using the same local `.env` does not share networks or storage. Keep these project names; do not override them with a shared project name.

Persistence after stack recreation remains untested in this exercise. To test it separately, restart each environment without removing volumes:

```sh
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.prod.yml up -d
curl -i http://localhost:3001/health
curl -i http://localhost:3002/health
curl -i http://localhost:3001/notes
curl -i http://localhost:3002/notes
```

Wait for readiness and repeat requests if necessary. Confirm each environment retains its own records. Production keeps a database volume; it has no mount of local application source. `down` preserves named volumes. Adding `-v` deletes the database volume and its data; do not use it for persistence tests.

## Separate shutdown

```sh
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml ps -a
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml ps -a
```

These commands preserve both database volumes.

## Validation checklist

- [x] Create the exercise's local `.env` and confirm Git ignores it.
- [x] Validate both Compose files with `config --quiet`.
- [x] Build the `dev` and `prod` targets using `npm ci --omit=dev`.
- [x] Run both environments simultaneously on ports 3001 and 3002, with healthy databases and HTTP 200 health responses.
- [x] Confirm development stores only `Development only` and production stores only `Production only`.
- [x] Confirm distinct volumes: `orion-ex3-dev_postgres_data` and `orion-ex3-prod_postgres_data`.
- [x] Demonstrate the temporary health response in development without a rebuild or manual restart, with `node --watch` logs confirming automatic detection and restart.
- [x] Confirm production retains its original health response during the local source edit.
- [x] Restore the temporary edit and confirm both health endpoints return `{"status":"ok"}`.
- [x] Stop development and confirm its containers and network are removed while production continues serving health and its own record.
- [x] Stop production and confirm its containers and network are removed, with each project's `ps -a` empty.
- [x] Complete shutdown without running `down -v`.
- [ ] Confirm each database retains its records after stack recreation; this test has not been performed in this exercise.

## Validation status

The user verified both builds, simultaneous operation, database health, separate records and volumes, native live reload, source isolation, and independent shutdown. Both stacks were stopped at the end and were not recreated afterward, so persistence after recreation remains unverified.

Configuration inspection establishes that production has no local source or dependency bind mount and retains a named database volume. Runtime testing confirmed that the temporary local source edit affected only development and that stopping development did not affect production. These observations are distinct from a persistence test after recreation.
