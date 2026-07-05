<div align="center">

<img src=".github/assets/banner.svg" alt="MakeADB" width="100%">

<br>
<br>

**Spin up real databases in seconds. One click, one container, one connection URL.**

[![License: MIT](https://img.shields.io/badge/license-MIT-white?style=flat-square&labelColor=0a0a0a)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-white?style=flat-square&labelColor=0a0a0a&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-required-white?style=flat-square&labelColor=0a0a0a&logo=docker&logoColor=white)](https://www.docker.com)
[![Made with Express](https://img.shields.io/badge/express-4.x-white?style=flat-square&labelColor=0a0a0a)](https://expressjs.com)

<br>

<img src=".github/assets/screenshot.png" alt="MakeADB dashboard" width="100%">

</div>

<br>

## What is it?

MakeADB is a tiny self-hosted panel that creates **disposable, production-grade databases** on demand. Pick an engine, give it a name, and get a ready-to-paste connection URL — each database runs in its own isolated Docker container with auto-generated credentials and its own port.

Perfect for prototyping, side projects, testing, CI sandboxes, or just avoiding the "let me install Postgres locally" dance for the tenth time.

## Supported engines

| Engine | Image | Default port range |
|--------|-------|--------------------|
| PostgreSQL | `postgres:16-alpine` | 10000–20000 |
| MySQL | `mysql:8` | 10000–20000 |
| MariaDB | `mariadb:11` | 10000–20000 |
| MongoDB | `mongo:7` | 10000–20000 |
| Redis | `redis:7-alpine` | 10000–20000 |

## Features

- **One-click provisioning** — name it, pick an engine, done. Image is pulled automatically if missing.
- **Instant connection URLs** — copy-paste ready (`postgresql://…`, `mongodb://…`, `redis://…`), built dynamically from the hostname you're browsing from.
- **Full lifecycle control** — start, stop and delete databases from the dashboard; containers restart with the host (`unless-stopped`).
- **Auto-generated credentials** — random user, password and database name per instance (or bring your own password).
- **State survives restarts** — metadata lives in a local SQLite file; container states are re-synced on boot.
- **Optional password gate** — protect the panel with a single password (HMAC-signed cookie sessions, no external deps).
- **Zero-config frontend** — vanilla HTML/CSS/JS, no build step, dark minimal UI.

## Quick start

### Docker Compose (recommended)

```bash
git clone https://github.com/Codealuxz/makeadb.git
cd makeadb
docker compose up -d
```

Open **http://localhost:3737** — that's it.

> The container needs access to the Docker socket (`/var/run/docker.sock`) to spawn database containers on the host.

### Manual (Node.js)

```bash
git clone https://github.com/Codealuxz/makeadb.git
cd makeadb
npm install
cp .env.example .env
npm start
```

Open **http://localhost:3000**.

## Configuration

All settings are optional and live in `.env` (see [`.env.example`](.env.example)):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port of the panel |
| `DB_HOST` | `localhost` | Host advertised in connection URLs (fallback — the request hostname is used when available) |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Docker socket path (named pipe is auto-detected on Windows) |
| `PORT_MIN` | `10000` | Lower bound of the port range assigned to databases |
| `PORT_MAX` | `20000` | Upper bound of the port range |
| `AUTH_PASSWORD` | *(empty)* | Set a password to protect the panel; leave empty to disable auth |

## API

The dashboard is a thin client over a small REST API — use it directly if you prefer:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Docker daemon availability |
| `GET` | `/api/types` | List supported engines |
| `GET` | `/api/databases` | List all databases with connection URLs |
| `POST` | `/api/databases` | Create a database — `{ "name": "my-app", "type": "postgresql", "password": "optional" }` |
| `POST` | `/api/databases/:id/start` | Start a stopped database |
| `POST` | `/api/databases/:id/stop` | Stop a running database |
| `DELETE` | `/api/databases/:id` | Delete a database and its container + volume |

```bash
curl -X POST http://localhost:3737/api/databases \
  -H "Content-Type: application/json" \
  -d '{"name": "my-app", "type": "postgresql"}'
```

```json
{
  "name": "my-app",
  "type": "postgresql",
  "port": 10000,
  "username": "user_a1b2c3d4",
  "password": "9f8e7d6c5b4a39281706f5e4d3c2b1a0",
  "db_name": "db_e5f6a7b8",
  "connection_url": "postgresql://user_a1b2c3d4:9f8e...@localhost:10000/db_e5f6a7b8",
  "status": "running"
}
```

## How it works

```
Browser ──► Express panel ──► Docker Engine API (dockerode)
                 │                    │
                 ▼                    ▼
          SQLite metadata      one container per DB
          (data/makeadb.db)    (makeadb-<uuid>, port 10000-20000)
```

1. On create, MakeADB picks a free port, generates credentials, pulls the image if needed and starts a container named `makeadb-<uuid>`.
2. Metadata (engine, port, credentials, status) is stored in a local SQLite database.
3. On boot, container states are re-synced with the Docker daemon so the dashboard always reflects reality.

## Security notes

- The panel mounts the **Docker socket**, which is root-equivalent on the host. Don't expose it on the public internet without at least setting `AUTH_PASSWORD` — and ideally keep it behind a reverse proxy, VPN or firewall.
- Database credentials are generated with `crypto.randomBytes` and stored locally in SQLite.
- Spawned databases are published on host ports (`PORT_MIN`–`PORT_MAX`); firewall that range if the machine is reachable from outside.

## License

[MIT](LICENSE) — do whatever you want with it.
