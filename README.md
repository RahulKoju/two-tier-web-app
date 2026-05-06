# Two-Tier Web App

Production-style two-tier web application deployed on AWS EC2 with Next.js 16, Prisma, PostgreSQL, Docker Compose, Jenkins CI/CD, Nginx reverse proxy, Certbot SSL, and systemd auto-start.

## System Architecture Overview

- This system runs as a two-tier deployment:
  - Web/application tier: Next.js 16 App Router application in Docker
  - Data tier: PostgreSQL 16 in Docker with persistent storage
- The application serves the task management UI and server-side data operations.
- Prisma connects the Next.js server runtime to PostgreSQL.
- Jenkins builds and deploys the containers.
- Nginx terminates HTTPS and forwards traffic to the application container.
- systemd restores the Docker deployment after server reboot.

## Deployment Architecture

- Host: AWS EC2 Ubuntu
- Source location for deployment: Jenkins workspace at `/var/lib/jenkins/workspace/two-tier-web-app`
- Public domain: `task.rahulkoju.com.np`
- Public entrypoint:
  - `80/tcp` → redirects to HTTPS
  - `443/tcp` → Nginx with Certbot-managed TLS
- Internal application entrypoint:
  - Nginx proxies requests to `http://localhost:3001`
- Containerized services from `docker-compose.yml`:
  - `app` → Next.js server
  - `db` → PostgreSQL
  - `migrate` → one-off Prisma migration runner

## Service Responsibilities

### App Container

- Built from the project `Dockerfile`
- Installs dependencies with `pnpm`
- Generates Prisma client during image build
- Builds the production Next.js application during image build
- Receives a container healthcheck that probes `http://localhost:3000`
- Starts at runtime through `scripts/start.sh`
- Runs `pnpm start` and listens on container port `3000`
- Published on host port `3001` through `3001:3000`

### DB Container

- Uses `postgres:16-alpine`
- Initializes database values from runtime environment variables:
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_DB`
- Persists data in Docker volume `postgres_data`
- Exposes readiness through:

```bash
pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

- Uses `restart: unless-stopped`

### Migrate Container

- Uses the same application image build context
- Runs:

```bash
npx prisma migrate deploy
```

- Connects to PostgreSQL through Docker DNS hostname `db`
- Starts only after the database healthcheck reports healthy
- Exits after migrations complete

## Container Architecture

- `db` starts first and initializes PostgreSQL with the runtime credentials from `.env`.
- `migrate` waits on `db` health, connects to `db:5432`, and applies the committed Prisma migrations.
- `app` waits on `db` health, starts the production Next.js server, and reads `DATABASE_URL` at runtime.
- `app` reports healthy only after its HTTP healthcheck succeeds.
- `app` and `migrate` both use:

```text
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

- Database persistence is outside the container filesystem through the named volume `postgres_data`.

## Networking Flow

- User request flow:
  - User → `task.rahulkoju.com.np` → Nginx → `localhost:3001` → `app` container → `db` container
- TLS termination happens at Nginx.
- Nginx forwards the original host header and upgrade headers to the app container.
- The application never connects to PostgreSQL through `localhost`.
- Docker internal service discovery resolves `db` to the PostgreSQL container IP on the Compose network.

### Nginx Reverse Proxy

- Site file: `/etc/nginx/sites-available/task.rahulkoju.com.np`
- HTTPS virtual host:
  - `server_name task.rahulkoju.com.np;`
  - `listen 443 ssl;`
  - `proxy_pass http://localhost:3001;`
- HTTP virtual host:
  - listens on port `80`
  - redirects `task.rahulkoju.com.np` to HTTPS with `301`
- TLS assets are managed by Certbot:
  - `/etc/letsencrypt/live/task.rahulkoju.com.np/fullchain.pem`
  - `/etc/letsencrypt/live/task.rahulkoju.com.np/privkey.pem`
  - `/etc/letsencrypt/options-ssl-nginx.conf`
  - `/etc/letsencrypt/ssl-dhparams.pem`

## Deployment Flow

### Manual Docker Flow

1. Build the application image:

```bash
docker build -t two-tier-web-app:<tag> .
docker tag two-tier-web-app:<tag> two-tier-web-app:latest
```

2. Start PostgreSQL:

```bash
docker compose up -d db
```

3. Wait for the database healthcheck to pass.

4. Run Prisma migrations:

```bash
docker compose run --rm migrate
```

5. Start the application:

```bash
docker compose up -d app
```

6. Wait for the app healthcheck to report healthy.

7. Verify running services:

```bash
docker compose ps
```

### Automated CI/CD Flow

- Git push updates the repository tracked by Jenkins.
- Jenkins checks out the latest source.
- Jenkins creates a runtime `.env` file from stored credentials.
- Jenkins builds a tagged Docker image for the current build and also tags it as `latest`.
- Jenkins starts the database container.
- Jenkins waits until PostgreSQL is ready to accept connections.
- Jenkins runs the migration container.
- Jenkins stops the current deployment and starts the updated application container.
- Jenkins waits until the app container healthcheck reports healthy.
- Jenkins verifies the resulting Compose state.
- If deployment verification fails, Jenkins attempts rollback to the previous image tag.

## CI/CD Pipeline Breakdown

The `Jenkinsfile` runs these stages in order:

### Checkout

- Runs `checkout scm`
- Pulls the repository contents into the Jenkins workspace

### Create .env

- Reads Jenkins credentials:
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_DB`
- Writes a local `.env` file used by Docker Compose

### Build Docker Image

- Runs:

```bash
docker compose build app
docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${IMAGE_TAG}
```

- Builds the `app` service image from the repository `Dockerfile`
- Produces `two-tier-web-app:latest` through the Compose build
- Tags that built image with the current Jenkins `BUILD_NUMBER`
- Prints matching Docker images for verification

### Run Migrations

- Starts the database container:

```bash
docker compose up -d db
```

- Polls PostgreSQL readiness from inside the running DB container until this succeeds:

```bash
docker compose exec db pg_isready -h localhost -p 5432
```

- Runs the migration container:

```bash
docker compose run --rm migrate
```

### Deploy

- Stops the running Compose deployment:

```bash
docker compose up -d --no-deps --force-recreate app
```

- Recreates only the `app` service from the newly built image
- Leaves the database container running during application rollout

### Verify

- Waits for the app container `two-tier-web-app` to reach Docker health status `healthy`
- Retries up to 12 times with 10-second intervals
- Fails the deployment if the healthcheck never becomes healthy
- Runs:

```bash
docker compose ps
```

- Confirms the service state after deployment

### Post Actions

- On failure:
  - prints `Pipeline failed! Attempting rollback...`
  - recreates `.env` from Jenkins credentials before rollback
  - sets `PREV_IMAGE` to `two-tier-web-app:<BUILD_NUMBER - 1>`
  - checks whether that previous image exists locally with `docker image inspect`
  - retags the previous image as `two-tier-web-app:latest`
  - starts `db` with `docker compose up -d db`
  - recreates `app` with `docker compose up -d --no-deps --force-recreate app`
  - verifies rollback health with the same Docker health polling loop
  - prints `No previous image found. Cannot rollback.` when no earlier tagged image exists
  - prints final Compose status with `docker compose ps`
  - runs `docker compose logs app`
- On success:
  - prints `Deployment successful!`
  - prunes Docker images older than 24 hours

## Runtime Behavior

- The Docker image is built once per deployment cycle.
- During image build:
  - dependencies are installed
  - PostgreSQL client tools are installed in the image
  - project files are copied in
  - Prisma client is generated
  - Next.js production build is created
- During runtime:
  - `db` starts and initializes PostgreSQL if the volume does not already contain data
  - Compose waits for the `db` healthcheck before allowing dependent services to proceed
  - `migrate` runs only when explicitly invoked by the deployment flow
  - `app` starts with `pnpm start` through `scripts/start.sh`
  - Docker marks the app healthy only after the container responds on `http://localhost:3000`
  - Nginx serves HTTPS and forwards requests to the app on `localhost:3001`
- The application becomes publicly available only after:
  - the app container is running
  - port `3001` is bound on the host
  - Nginx is serving the domain over HTTPS

## Restart, Failure Handling, and Recovery

### If the DB Is Not Ready

- `app` does not start until `db` is healthy because of `depends_on` with `condition: service_healthy`
- `migrate` does not run until the same healthcheck passes

### If Migration Fails

- `docker compose run --rm migrate` exits with failure
- Jenkins stops the pipeline at the migration stage
- The deploy stage does not complete until migrations succeed

### If the App Fails Health Verification

- Jenkins polls Docker health status for container `two-tier-web-app`
- If the container never becomes healthy within 12 checks at 10-second intervals, the verify stage fails
- The pipeline enters the failure block and attempts rollback to the previous tagged image

### If the App Crashes

- The `app` service uses `restart: unless-stopped`
- Docker restarts the container automatically unless it was intentionally stopped
- The same container also exposes a Docker healthcheck used by Jenkins verification

### If the DB Crashes

- The `db` service uses `restart: unless-stopped`
- Docker restarts the container automatically unless it was intentionally stopped

### On Server Reboot

- `systemd` unit: `/etc/systemd/system/two-tier-web-app.service`
- Unit definition:
  - `Requires=docker.service`
  - `After=docker.service network-online.target`
  - `Type=oneshot`
  - `RemainAfterExit=yes`
  - `WorkingDirectory=/var/lib/jenkins/workspace/two-tier-web-app`
  - `ExecStart=/usr/bin/docker compose up -d db app`
  - `ExecStop=/usr/bin/docker compose down`
- Boot behavior:
  - Docker starts first
  - systemd runs `docker compose up -d db app`
  - PostgreSQL and the application are restored from the last deployed Compose configuration
- This reboot path starts `db` and `app` only. It does not run the `migrate` container automatically.

## Security and Environment Handling

- Database secrets are not hardcoded into the Docker image.
- Runtime environment values are injected through Docker Compose.
- Jenkins writes the `.env` file during deployment from managed credentials instead of committing secrets to the repository.
- `DATABASE_URL` is constructed at runtime for both `app` and `migrate`.
- Jenkins deploys versioned images using the current `BUILD_NUMBER` and retains `latest` as the active tag alias.
- TLS termination and certificate files are handled at the Nginx layer through Certbot-managed files on the EC2 host.

## Final Architecture Diagram

```mermaid
flowchart TD
    GH[GitHub Repository] --> J[Jenkins Pipeline]
    J --> ENV[Create .env from Jenkins Credentials]
    ENV --> BUILD[Docker Build and Tag]
    BUILD --> DC[Docker Compose Deployment]

    subgraph EC2[AWS EC2 Ubuntu Host]
        DC --> DB[(db container<br/>PostgreSQL 16)]
        DC --> MG[migrate container<br/>prisma migrate deploy]
        DC --> APP[app container<br/>Next.js 16]
        DB --> VOL[(postgres_data volume)]

        INTERNET[Internet] --> NGINX[Nginx<br/>SSL via Certbot]
        NGINX -->|proxy to localhost:3001| APP
        APP -->|DATABASE_URL uses db:5432| DB
        APP --> HC[Docker Healthcheck]
        HC --> J

        SD[systemd<br/>two-tier-web-app.service] -->|docker compose up -d db app| DC
        J --> RB[Rollback to Previous Image]
    end
```

## Verification

- Development server: `pnpm dev`
- Lint: `pnpm lint`
- Production build: `pnpm build`
