# WEC Live Dashboard

Live timing dashboard for FIA World Endurance Championship sessions. The ingestor polls the public WEC timing feed, stores the latest state and recent snapshots in Redis, the API exposes that data through Fastify, and the React app renders the dashboard.

## Stack

- Node.js, TypeScript, pnpm workspaces
- Redis for current timing state and session snapshots
- Fastify API in `packages/api`
- React 19, Vite, and Tailwind CSS v4 in `packages/app`
- Timing feed ingestor in `packages/ingestor`

## Prerequisites

- Node.js 18 or newer
- pnpm
- Redis available at `redis://localhost:6379`, or set `REDIS_URL`

## Install

```bash
pnpm install
```

## Development

Start Redis first, then run all development services:

```bash
pnpm dev
```

This starts:

| Service | Command | Default URL |
| --- | --- | --- |
| Ingestor | `pnpm --filter ingestor run dev` | N/A |
| API | `pnpm --filter api run dev` | `http://localhost:8001` |
| App | `pnpm --filter app run dev` | `http://localhost:5173` |

The Vite dev server proxies `/api/*` to `http://localhost:8001`.

Run services individually when debugging a specific package:

```bash
pnpm --filter ingestor run dev
pnpm --filter api run dev
pnpm --filter app run dev
```

Useful endpoints while developing:

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | API health check |
| `GET /api/current` | Latest live snapshot |
| `GET /api/entries?category=HYPERCAR` | Entries, optionally filtered by category |
| `GET /api/entries/{id}` | Single entry detail |
| `GET /api/sessions` | Known sessions |
| `GET /api/history` | Recent stored snapshots |

## Build

Build every workspace package:

```bash
pnpm build
```

Or build a single package:

```bash
pnpm build:app
pnpm build:api
pnpm build:ingestor
```

The API serves the built frontend from `packages/app/dist` when that directory exists.

## Run Built Output

Build first, make sure Redis is running, then start the long-running processes:

```bash
pnpm build
pnpm start:ingestor
pnpm start:api
```

Open `http://localhost:8001` for the built dashboard. Set `PORT` only if you need a non-default API port; do not use `8080` because that port is reserved for the F1 dashboard:

```bash
PORT=8002 pnpm start:api
```

## Checks

Run these before opening a PR or handing off changes:

```bash
pnpm typecheck
pnpm lint
pnpm fmt:check
```

Fix formatting and auto-fixable lint issues with:

```bash
pnpm fmt
pnpm lint:fix
```

Remove generated `dist` directories:

```bash
pnpm clean
```

## Development Process

1. Keep changes scoped to the affected package.
2. Use `pnpm dev` for end-to-end work, or run one package directly for focused debugging.
3. If API shape changes, update the matching app code and keep endpoint behavior documented here.
4. Run `pnpm typecheck` after TypeScript changes.
5. Run `pnpm lint` and `pnpm fmt:check` before committing.
6. For release or deployment changes, verify `pnpm build` and start the built API with the app bundle present.

## Data Source

The ingestor polls:

```text
https://storage.googleapis.com/ecm-prod/live/WEC/data.json
```

The feed is public and requires no authentication. It updates during live sessions and may be stale or sparse outside active race weekends.

The data is owned by Al Kamel Systems S.L. and should be treated as personal-use data. The project does not include GPS positions, car telemetry, or replay data beyond the Redis snapshots captured while the ingestor is running.
