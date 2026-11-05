# AssetTrack (mobile)

Expo (React Native + TypeScript). Scan a QR code, see the item, its movement history, and recently scanned items.

## Run it while developing

```bash
npm install
cp .env.example .env     # set EXPO_PUBLIC_API_URL to your deployed Vercel URL
npx expo start
```

Install **Expo Go** on your phone and scan the terminal QR code (same Wi-Fi). Use the deployed backend URL,
not `localhost`, because the phone can't reach your computer's localhost.

## Build an installable Android APK

1. Edit `app.json` → `android.package` (and `ios.bundleIdentifier`) to your own id. It is permanent once published.
2. Edit `eas.json` → set `EXPO_PUBLIC_API_URL` in the `preview` profile to your Vercel URL. It is baked in at build time.
3. ```bash
   npm i -g eas-cli
   eas login
   eas build:configure
   eas build -p android --profile preview
   ```
4. Open the build link on your phone, download the `.apk`, allow "Install unknown apps" once, install, open **AssetTrack**.

After install it runs standalone: no computer, Expo Go or dev server needed. Bump `version` in `app.json` for each new build.

## How it behaves

| Situation | Behaviour |
|---|---|
| Offline | App opens; scanning disabled with an offline card; Recent and History read from the device |
| QR isn't a 32-char hex code | "This isn't an AssetTrack code." (no API call) |
| Item not found (404) | "Item not found... please contact the admin." |
| Network / 5xx | Message with Retry; 5xx and crashes are queued as error reports |
| Token expired (401) | New guest token fetched silently, request retried once |
| Missing/failed image | Crate icon + "image didn't load" |
| Item deleted upstream | Kept in Recent, marked "No longer available" |

Saved items refresh when the app returns to the foreground, when a Recent item is opened, and on pull-to-refresh.
Error reports are queued on the device, batched, and sent to `POST /v1/errors` when online (at most one batch per 30 s).

## Loading, caching and slow connections

- **Skeletons:** a scan shows a placeholder detail screen while the item loads; History shows placeholder
  timeline rows on first load; photos shimmer until they appear. Data already on screen is never replaced by a
  skeleton, it just shows a small "Updating..." note.
- **Freshness cache:** saved items count as fresh for 30 s and history for 60 s (`src/config.ts`). Within that window
  the app skips the network. Pull-to-refresh always forces a refresh.
- **Instant rescans:** scanning an item already saved on the phone opens it immediately, then revalidates only if stale.
- **Fewer requests:** identical simultaneous requests share one call, and refreshes are skipped for fresh data.
- **Image cache:** photos are cached on disk (expo-image) and prefetched after each fetch.
- **Slow warnings:** after 3 s "Taking longer than usual...", after 8 s "Still working. Your connection may be slow."
  (with a Cancel button while scanning). Requests time out at 15 s with a Retry option. Tune in `src/config.ts`.

## Structure

```
App.tsx                  startup, tabs, global error handler
src/api/client.ts        fetch wrapper: guest token, timeout, 401 retry
src/store/useStore.ts    persisted state: token, recents, history cache
src/store/errorQueue.ts  persisted error-report queue
src/services/            refresh logic, error reporter
src/screens/             ScanTab (scanner + detail), HistoryScreen, RecentScreen
src/lib/eventUi.ts       event type -> icon + wording
```
