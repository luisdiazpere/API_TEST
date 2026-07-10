# ip-lookup-app

Batch IP and domain geolocation lookup tool. Paste or upload a list of IPs, domains, or URLs and get back enriched geolocation data (country, continent, ASN, organization) via the [ipinfo.io Lite API](https://ipinfo.io/developers/lite-api) — with per-user accounts and saved lookup history.

## Features

- **Batch lookups** — up to 50 entries per request, mixed IPs / domains / URLs, comma- or newline-separated, with optional `.txt` file upload (drag-and-drop)
- **DNS resolution** — domains and URLs are resolved to all their IPs before lookup
- **Bogon detection** — private/reserved ranges are flagged and skipped, not sent to the API
- **Stats** — per-batch breakdown by country, continent, and ASN, plus cache/API call counts
- **Accounts & history** — session-based login; every batch is saved and can be re-viewed or deleted from the history page
- **Exports** — download results as CSV or JSON, client-side
- **Response cache** — in-memory TTL cache (10 min) keeps repeat lookups off the API quota
- **Rate limiting** — 30 requests/min per IP on the lookup endpoint

## Quick start

Requires Node.js 18+ (uses the built-in `fetch`).

```bash
npm install
```

Create a `.env` file in the project root:

```bash
IPINFO_TOKEN=<your ipinfo.io token>          # https://ipinfo.io/signup
SESSION_SECRET=<random string>               # e.g. openssl rand -hex 32
```

Then:

```bash
npm start
# → http://localhost:3000 (redirects to the login page)
```

Create an account, run a batch, and check **account menu → Search history**.

## API

All routes are JSON over same-origin session cookies. Everything except register/login requires a session.

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register` | — | Create account (name, email, password ≥ 8 chars) |
| `POST /api/auth/login` | — | Sign in |
| `POST /api/auth/logout` | session | Sign out |
| `GET /api/auth/me` | session | Current user |
| `POST /api/lookup` | session | Batch lookup (multipart: `ips` text + optional `file`) |
| `GET /api/history` | session | List your saved sessions |
| `GET /api/history/:id` | session | Full stored results for one session |
| `DELETE /api/history/:id` | session | Delete a saved session |

## Architecture

Express app, no build step, vanilla-JS frontend served from `public/`. Persistence is a single SQLite file (`data.sqlite`, gitignored) holding users, lookup history, and login sessions.

Request pipeline for `POST /api/lookup`, one `src/` module per stage:

```
parseInput → validate/hostname → dnsResolve → dedupe → ipinfoClient (cache + mapLimit) → stats
```

Tunables (max entries, cache TTL, concurrency, port) live in `src/config.js`.

## Security

- Secrets only via environment variables — the server refuses to start without them
- Passwords hashed with bcrypt (12 rounds); sessions are `httpOnly` + `sameSite=lax` cookies with server-side revocation
- All user- and API-sourced values are HTML-escaped before rendering
- Upload size (1 MB) and JSON body (50 KB) limits; per-IP rate limiting
- For HTTPS deployments, set `app.set("trust proxy", 1)` and `cookie.secure: true`

The full development record — every change, how it was built, and why — is in [`docs/development-history.html`](docs/development-history.html).

## Project structure

```
server.js            Express app: sessions, routes, lookup pipeline
src/                 Backend modules (config, db, auth, history, pipeline stages)
public/              Frontend: index, login, signup, history + shared JS/CSS
docs/                Development history documentation
```

## Status

Prototype. No test suite, no password-reset flow, single-process only.
