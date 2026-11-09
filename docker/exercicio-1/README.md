# Docker Exercise 1

## Objective

Build a lightweight Docker image for an Express application and run it with Docker Compose. The application listens on `0.0.0.0:3000` and responds to `GET /` with HTTP 200 and the exact text `Hello from Docker!`.

## Requirements

- Docker with Linux containers and Docker Compose available.
- Access to Docker Hub and the npm registry.
- Port 3000 available on the host.

The base image is the official `node:24-alpine` image. Node.js 24 is a supported LTS release, and the Alpine image supports `linux/arm64`.

References: [Node.js release schedule](https://github.com/nodejs/Release) and [official Node.js image](https://hub.docker.com/_/node).

The Dockerfile uses `npm ci --omit=dev` to install production dependencies according to the version-controlled `package-lock.json`.

## Build and start

From the repository root, enter the exercise directory, validate the Compose configuration, then build and start in the background:

```sh
cd docker/exercicio-1
docker compose config --quiet
docker compose up --build -d
```

Open http://localhost:3000. The service publishes port 3000 only on the host loopback address. No source volume is mounted.

## Verify the response

In another terminal, run:

```sh
curl -i http://localhost:3000/
```

Expect HTTP 200 and this exact response body, without a trailing newline:

```text
Hello from Docker!
```

## Status, logs, and shutdown

Run from the exercise directory:

```sh
docker compose ps
docker compose logs app
docker compose down
docker compose ps -a
```

## Criteria checklist

- [x] Generate `package-lock.json` with npm in a temporary `node:24-alpine` container.
- [x] Validate the configuration with `docker compose config --quiet`.
- [x] Build and start successfully with `docker compose up --build -d`.
- [x] Confirm `docker compose ps` shows `app` running on `127.0.0.1:3000`.
- [x] Confirm `GET /` returns HTTP 200, `text/plain`, and the exact expected body using curl.
- [x] Confirm the browser displays `Hello from Docker!`.
- [x] Inspect the Dockerfile for `FROM node:24-alpine` and `USER node`; the container user was not tested with `id`.
- [x] Inspect `.dockerignore` for exclusions of dependencies, Git files, logs, coverage, and environment files.
- [x] Inspect logs and confirm no errors were reported.
- [x] Stop with `docker compose down`, confirm container and network removal, and confirm `docker compose ps -a` is empty.
- [x] Save browser and terminal screenshots.

## Validation status

Validation in the user's terminal confirmed successful lockfile generation, Compose validation, image build, service startup, HTTP response, browser display, and logs without errors. Shutdown removed the container and network, and no containers remained in `docker compose ps -a`. Browser and terminal screenshots were saved. Dockerfile and `.dockerignore` settings were inspected separately from runtime checks.
