# Test all MVP changes

Branch: `test/mvp-hardening`, based on local `main` at `7147c7c`. This checkout is `/Users/hyunki/Desktop/honji-pictionary`. Original review commits were copied with cherry-pick and remain individually reviewable. `main` was not changed; nothing has been pushed or deployed. The extra mobile-height CSS commit on `fix-vh` was not included because this branch starts from main.

## Start the app

The repo already has installed dependencies and local environment configuration. Use matching development Redis and Blob stores for failure/cleanup tests. From this folder run `npm run api`, then open the local address it reports. `npm run ui` by itself does not provide the API. Create fresh rooms: sessions created before the permissions change cannot authenticate.

## Combined checklist

1. Open a host window and join two players in separate browser profiles/devices. Upload avatars, start, draw, submit manually and at timeout, then view results and quit. Reload the lobby once to verify session persistence.
2. Enter a 15-character name: it should work. More than 15 cannot be entered in the form; a direct 16-character API request should return 400. Duplicate-name suffixes also fit within 15 characters.
3. Join ten players; the eleventh gets a visible room-full message. Confirm simultaneous joins cannot exceed the cap.
4. From another browser with only the room code, host start/quit and other players' submissions must fail. Retry scoring also requires the host credential.
5. Block room polls temporarily while drawing. The canvas/undo history should remain; unblock and submit the same image. Refreshing or closing the tab still loses unsaved drawings.
6. Send simultaneous start or submission requests. Only one round/one submission per player should be saved; conflicting host actions can return 409.
7. In a development-only mock, fail AI scoring three times. Drawings stay saved and the host sees Retry scoring. Restore successful scoring and retry the same round. Retries are authenticated and rate-limited.
8. Inspect Redis expiry before and after state transitions. Room updates must preserve the remaining lifetime; expired rooms cannot be resurrected.
9. Run the Blob cleanup dry-run below. Deletion is disabled by default and no live images were deleted during implementation.

## Guides

- [Permissions](server-permissions.md)
- [Usage limits](usage-limits.md): 15-character names, ten players.
- [Concurrency](concurrent-writes.md)
- [Drawing preservation](preserve-drawings.md)
- [Scoring recovery](scoring-recovery.md)
- [Room expiry](room-expiry.md)
- [Temporary Blob retention](blob-cleanup.md): configuration and dry-run/deletion tests.

## Automated checks

```sh
npm run build
./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --esModuleInterop api/*.ts
node --test tests/*/regression.cjs
npm run lint
```

Build, frontend/API checks and regression tests are rerun after integration. Lint has four existing errors and four warnings; manual browser/service checks remain necessary. Regression tests mock paid services and never delete live files.

## Blob cleanup setup

Set `CRON_SECRET` locally and in Vercel. The authenticated `/api/cleanup-blobs?dryRun=1` endpoint reports candidates without deletion. Enable `BLOB_CLEANUP_ENABLED=true` only after testing against a dedicated development store. Preview deployments always dry-run. The configured daily schedule takes effect after production deployment. Images are eligible after one hour and only when the room is absent; actual deletion is eventual, typically within about 25 hours at low volume. Files downloaded/cached by users cannot be recalled. See the Blob guide for details.
