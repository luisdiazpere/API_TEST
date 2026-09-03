# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Run the server: `npm start` (runs `node server.js`, listens on the port in `src/config.js`)
- Start ngrok tunnel: `bin/ngrok http 3000` (binary at `bin/ngrok`, gitignored). One-time setup: create a free account at ngrok.com, copy the authtoken from the dashboard, run `bin/ngrok config add-authtoken <token>` once, then `bin/ngrok http 3000` each time. Public URL is printed to stdout; traffic inspector at http://localhost:4040.
- No build step, no lint script, and no test suite are configured in this repo.

## Architecture

This is a small Express app (`ip-lookup-app`) that batch-resolves IPs/domains to geolocation data via the ipinfo.io Lite API. Persistence is a SQLite file (`data.sqlite`, gitignored) managed by `src/db.js` (better-sqlite3): `users` and `lookups` tables plus the session store. The ipinfo response cache remains in-memory.

**Auth**: session-based login (express-session + SQLite store, bcrypt passwords) in `src/auth.js` — routes `/api/auth/{register,login,logout,me}` and a `requireAuth` middleware. Clerk is a second sign-in path: the browser exchanges a Clerk token via `POST /api/auth/clerk`, which verifies it (`@clerk/backend`), upserts a `users` row (empty `password_hash` marks a Clerk-only account — blocked from the password login path), and issues the same `express-session` — every downstream check (`requireAuth`, `/api/history`) is unchanged. The publishable key is served to the static auth pages via `GET /clerk-key.js`. `authorizedParties` for token verification is derived from the request's own protocol/host (not a fixed value), so it works unmodified on localhost, Render, or any future domain — requires `app.set("trust proxy", 1)` in `server.js`. A user's first Clerk sign-in sends a welcome email (`src/mail.js`, nodemailer) — skipped on repeat sign-ins, and a no-op (logged to the console) if `SMTP_URL` is unset. `/api/lookup` requires login; each batch is saved to history (`src/history.js`, routes `/api/history`). Requires `IPINFO_TOKEN`, `SESSION_SECRET`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` in `.env`; `SMTP_URL`/`MAIL_FROM` are optional.

**Request flow** (`server.js` → `POST /api/lookup`), each stage in its own `src/` module:

1. `parseInput.js` — merges the `ips` textarea field and an optional uploaded file (`multer`, memory storage) into a deduplicated list of raw tokens (split on newlines/commas).
2. For each token: `validate.js` (`net.isIP`) checks if it's already a literal IP; otherwise `hostname.js` extracts a hostname from a bare domain or URL via regex/`URL` parsing.
3. `dnsResolve.js` resolves extracted hostnames to IPs (`dns.lookup`, all addresses), run concurrently via `Promise.all`.
4. Direct IPs and DNS-resolved IPs are merged into a deduped `Map` (keyed by IP, tracking `resolvedFrom` for display), then passed to `ipinfoClient.js`.
5. `ipinfoClient.js` looks up each IP against `cache.js` (in-memory `Map`, TTL-based expiry) first, then calls the ipinfo.io API for cache misses, bounded by `LOOKUP_CONCURRENCY` via a hand-rolled `mapLimit` worker pool. Cache/API call counts are tracked for the response `meta`.
6. `stats.js` aggregates the enriched results into counts by country/continent/ASN and a bogon (private/reserved IP) count.
7. `server.js` assembles the final JSON: `results`, `invalid`, `apiErrors`, `dnsErrors`, `stats`, `meta`.

All tunables (ipinfo token/base URL, `MAX_IPS_PER_REQUEST`, cache TTL, lookup concurrency, port) live in `src/config.js`. The ipinfo token is read from the `IPINFO_TOKEN` environment variable — set it in `.env` (gitignored) before running.

**Frontend** (`public/`): vanilla JS, no framework/build tool, served statically by Express. Pages: `index.html` (lookup tool, requires session — redirects to login via `shared.js`), `login.html`/`signup.html` (`auth-pages.js`), `history.html` (`history.js`). `app.js` renders results/stats/errors, exports CSV/JSON client-side, and can re-render a saved session via `/?session=<id>`. Dark theme design tokens live in `style.css` (source design: `untitled.pen`, gitignored).

**API testing**: `postman/` and `.postman/` hold a local Postman workspace/collection setup for exercising the API manually (gitignored, not in the repo).

## Rules

- **Never work directly on `master`.** Always create a new branch for any change, no matter how small.
- **Never assume — ask first.** If anything about a task is ambiguous (scope, intent, destructive side-effects), ask a clarifying question before proceeding.
