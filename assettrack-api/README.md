# AssetTrack API

Node.js + TypeScript backend for Vercel. Google Sheets is the database.

## Sheet layout (header names matter, column order does not)

**Items**: `asset_number, code, item_name, description, category, condition, status, owner, location, picture_url, updated_at`
(`Item Name`, `Designated Owner` etc. are also recognised. `condition` = Good/Bad, `status` = Available/In Use/Maintenance.)

**Movements** (append-only): `event_id, timestamp, asset_number, event_type, from_location, to_location, from_owner, to_owner, status_after, performed_by, notes`
`event_type` is one of: CHECKED_OUT, CHECKED_IN, TRANSFERRED, RETURNED, OWNER_CHANGED, STATUS_CHANGED, MAINTENANCE. Use ISO 8601 UTC timestamps.

**error report**: `timestamp, guest_id, app_version, platform, os_version, screen, error_type, http_status, endpoint, message, stack, count`

Run `sheet-setup/assignCodes.gs` (Apps Script) once to fill the `code` column with 32-char hex values. The QR encodes that value as-is.

## Setup

1. Google Cloud: enable Sheets API, create a service account, download the JSON key.
2. Share the Sheet with the service account email as **Editor**.
3. `cp .env.example .env` and fill in `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SHEET_ID`, `JWT_SECRET` (`openssl rand -hex 32`).
4. `npm install && npx vercel dev`
5. Deploy: `npx vercel --prod`, then add the same variables under Project -> Settings -> Environment Variables.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/auth/guest` | header `x-app-id: assettrack` | returns `{ token, guestId, expiresIn }` |
| GET | `/v1/items/:code` | Bearer token | 400 bad code, 404 not found |
| GET | `/v1/items/:code/history?limit=` | Bearer token | `{ assetNumber, events[] }`, newest first |
| POST | `/v1/errors` | Bearer token | `{ reports: [...] }`, max 20, 32 KB |

Errors are `{ "error": { "code", "message" } }`. Codes: `TOKEN_INVALID` (401, app re-requests a guest token and retries once), `INVALID_CODE`, `ITEM_NOT_FOUND`, `RATE_LIMITED` (429 + Retry-After), `INTERNAL`.

## Try it

```bash
BASE=http://localhost:3000/v1
TOKEN=$(curl -s -X POST $BASE/auth/guest -H 'x-app-id: assettrack' | jq -r .token)
curl -s $BASE/items/<32-char-code> -H "Authorization: Bearer $TOKEN"
curl -s $BASE/items/<32-char-code>/history -H "Authorization: Bearer $TOKEN"
```

## Known MVP limits

- Rate limiting and caching are per serverless instance (best effort). Upgrade `lib/ratelimit.ts` / `lib/sheets.ts#cached` to Upstash Redis for shared limits.
- The guest token stops casual abuse, not a determined attacker with the APK.
- Only `lib/repo.ts` and `lib/sheets.ts` know about Sheets, so a later move to Postgres touches those two files.
