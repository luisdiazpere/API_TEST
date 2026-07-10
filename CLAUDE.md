# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Run the server: `npm start` (runs `node server.js`, listens on the port in `src/config.js`)
- No build step, no lint script, and no test suite are configured in this repo.

## Architecture

This is a small Express app (`ip-lookup-app`) that batch-resolves IPs/domains to geolocation data via the ipinfo.io Lite API. There is no database — all state is in-memory.

**Request flow** (`server.js` → `POST /api/lookup`), each stage in its own `src/` module:

1. `parseInput.js` — merges the `ips` textarea field and an optional uploaded file (`multer`, memory storage) into a deduplicated list of raw tokens (split on newlines/commas).
2. For each token: `validate.js` (`net.isIP`) checks if it's already a literal IP; otherwise `hostname.js` extracts a hostname from a bare domain or URL via regex/`URL` parsing.
3. `dnsResolve.js` resolves extracted hostnames to IPs (`dns.lookup`, all addresses), run concurrently via `Promise.all`.
4. Direct IPs and DNS-resolved IPs are merged into a deduped `Map` (keyed by IP, tracking `resolvedFrom` for display), then passed to `ipinfoClient.js`.
5. `ipinfoClient.js` looks up each IP against `cache.js` (in-memory `Map`, TTL-based expiry) first, then calls the ipinfo.io API for cache misses, bounded by `LOOKUP_CONCURRENCY` via a hand-rolled `mapLimit` worker pool. Cache/API call counts are tracked for the response `meta`.
6. `stats.js` aggregates the enriched results into counts by country/continent/ASN and a bogon (private/reserved IP) count.
7. `server.js` assembles the final JSON: `results`, `invalid`, `apiErrors`, `dnsErrors`, `stats`, `meta`.

All tunables (ipinfo token/base URL, `MAX_IPS_PER_REQUEST`, cache TTL, lookup concurrency, port) live in `src/config.js`. The ipinfo token is read from the `IPINFO_TOKEN` environment variable — set it in `.env` (gitignored) before running.

**Frontend** (`public/`): a single vanilla-JS page (no framework/build tool). `app.js` submits the form via `fetch` to `/api/lookup`, renders the results table/stats/error groups, and supports exporting results as CSV or JSON client-side. Served statically by Express from `public/`.

**API testing**: `postman/` and `.postman/` hold a Postman workspace/collection setup for exercising the API manually.

## Rules

- **Never work directly on `master`.** Always create a new branch for any change, no matter how small.
- **Never assume — ask first.** If anything about a task is ambiguous (scope, intent, destructive side-effects), ask a clarifying question before proceeding.
