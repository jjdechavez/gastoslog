# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo with two independent projects:

- **Go API** (repo root, module `gastoslog`) — the backend, deployed to Fly.io.
- **Expo/React Native app** (`cmd/gastoslog-app/`) — the mobile client, its own package.json/node project nested inside the Go module. Go tooling ignores it (excluded in `.air.toml`).

## Backend (Go API)

### Commands

```bash
make build       # CGO_ENABLED=1 GOOS=linux build -> ./main (used for prod/Docker)
make build-dev   # same but GOOS=darwin, for local (macOS) binaries
make run         # go run cmd/api/main.go
make test        # go test ./... -v
make watch       # live reload via air (make build-dev on change), respects .air.toml
make docker-run  # start Postgres/sqlite-adjacent docker-compose services
make docker-down # stop docker-compose services
make clean       # rm ./main
```

Run a single Go test:
```bash
go test ./internal/server/... -run TestHandler -v
```

CGO is required (go-sqlite3), so cross-compiling needs the matching `GOOS`/CC toolchain — that's why `build` and `build-dev` are separate targets.

### Runtime configuration

Config is loaded once via `internal/config.LoadENV()`, called at the top of `cmd/api/main.go`. Behavior branches on `APP_ENV`:
- `APP_ENV=local` → reads `.env` from the working directory (`godotenv.Read`).
- anything else → reads directly from process env (e.g. Fly.io secrets).

Required vars: `APP_ENV`, `HOST`, `PORT`, `BLUEPRINT_DB_URL` (sqlite DSN), `AUTH_SECRET` (JWT signing key — process exits if missing). Access these via the exported `config.XXX` package vars, not `os.Getenv` directly, elsewhere in the codebase.

### Architecture

Request flow: `chi` router → `huma/v2` (OpenAPI-generating framework) groups at `/api/v1` → per-domain handler (`internal/api/v1/*_handler.go`) → domain service (`internal/{account,target}/service.go`, expense/category logic currently lives directly in handlers) → repository (`internal/database/*.go`, using `sqlx`).

- **Handlers** (`internal/api/v1/`): huma-style `func(ctx, *XInput) (*XOutput, error)` methods. Input/Output are structs with `Body`/`path`/`query` tagged fields — huma uses these struct tags to generate OpenAPI docs and validate requests. Handlers pull the authenticated user id via `middleware.GetContextUserID(ctx)` and translate service errors to `huma.ErrorXxx(...)`.
- **Services** (`internal/account`, `internal/target`): business logic, input validation (e.g. parsing `RFC3339` dates, converting float currency to integer cents `int64(amount * 100)`), and mapping DB rows to response DTOs. Expense/category currently skip this layer — handlers call repositories directly.
- **Repositories** (`internal/database/*.go`): one file per table (`account.go`/users, `category.go`, `expense.go`, `target.go`, `target_log.go`), each defining an interface (e.g. `TargetRepository`) + `sqlx`-backed struct implementation. `database.Service` (in `database.go`) is the aggregate root exposing `XRepository()` factory methods and owns the single `*sqlx.DB`; schema migration is inline `CREATE TABLE IF NOT EXISTS` DDL run at `New()` startup (see `initializeSchema`), not a separate migration tool.
- All routes are registered by hand in `internal/server/routes.go` — new endpoints must be wired here (huma group, method, path, `Security: bearerSecurity` if auth required) in addition to adding the handler method.

### Auth

- JWT (HS256) via `internal/auth/jwt.go`, signed/verified with `config.AUTH_SECRET`.
- `internal/middleware.NewBasicAuthMiddleware` is registered as a huma middleware on the whole `/api/v1` group; it only enforces the bearer check on operations whose `huma.Operation.Security` includes `"bearer"` — routes without that field are public.
- On success it stashes the user id (as `float64`, since JWT claims decode numbers that way) in the huma context under key `"userID"`; retrieve it with `middleware.GetContextUserID(ctx)`, which returns `float64` — callers cast to `int64` at call sites.
- Money is stored/passed as integer cents (`amount * 100`) throughout the target/expense domains — don't switch to float storage.

### Deployment

Fly.io (`fly.toml`, app `gastoslog`, region `hkg`), single Docker multi-stage build (`Dockerfile`, alpine + CGO), sqlite DB persisted on a Fly volume mounted at `/data`. Deploys via `.github/workflows/fly-deploy.yml`.

## Frontend (Expo app, `cmd/gastoslog-app/`)

### Commands (run from `cmd/gastoslog-app/`)

```bash
pnpm start          # expo start
pnpm android        # expo run:android
pnpm ios            # expo run:ios
pnpm web            # expo start --web
pnpm lint           # expo lint
pnpm prod:android   # NODE_ENV=production expo run:android
```

Package manager is **pnpm** (pnpm-lock.yaml present) — don't use npm/yarn here.

### Architecture

- **Routing**: `expo-router` (file-based). `app/_layout.tsx` is the root; `app/(auth)/` is a route group gated by session state, with its own `(tabs)/` group for the bottom-tab screens (index/expense/target/category/profile). Dynamic segments follow Next-style brackets, e.g. `app/(auth)/target/[targetId].tsx`, `app/(auth)/target/[targetId]/log.tsx`.
- **Session**: `context/session.tsx` (`SessionProvider`/`useSession`) wraps the app, persists the JWT (and refresh token) via `hooks/useStorageState.ts` (backed by `expo-secure-store`). Sign-in/up write to secure storage; there's no server-driven logout endpoint call — `signOut` just clears local storage.
- **API client**: `services/api.ts` exposes a single `api()` factory grouping calls by domain (`auth`, `category`, `expense`, `target`, with nested `target.logs`), each calling `services/request.ts`'s `ofetch` instance. Base URL comes from `EXPO_PUBLIC_API_URL` (`.env`, e.g. `http://10.0.2.2:8080/api` for Android emulator loopback). The request instance auto-attaches the bearer token from secure storage and contains an in-progress (not fully implemented) 401 refresh-token queuing flow in `onResponse` — be aware it's a known incomplete area, not a stable pattern to copy elsewhere without checking.
- **List query params**: use `getSearchParams`/`cleanEmptyParams` (`services/api.ts`) before building query strings — these strip default `page`/`limit` values and empty/NaN params rather than sending them.
- Types mirror backend DTOs under `types/*.ts` (`category.ts`, `expense.ts`, `target.ts`, `api.ts` for shared `ListMeta`/pagination shapes) — when changing a Go response DTO (`internal/{target,account}/service.go` or a handler's inline `Body` struct), update the matching TS type.
- Styling: `nativewind` (Tailwind for RN) plus a `components/` library of hand-rolled primitives (`Button`, `Card`, `Fieldset`, `Select`, `HStack`, etc.) — prefer composing these over ad hoc RN `View`/`Text` styling.
- Forms: `react-hook-form` + `zod`/`@hookform/resolvers`.
