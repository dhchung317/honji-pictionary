# Temporary Blob retention

Images are temporary. Eligible images are at least one hour old AND their room record is absent. This includes avatars, replaced drawings and orphan uploads with the game's expected UUID-based paths. Unrelated assets and images in active rooms are skipped. Legacy/custom paths outside the recognized game pattern are not automatically removed.

The scheduled job uses Vercel Blob list/delete APIs and runs daily at 05:00 UTC. It scans up to 500 images per invocation, remembering its cursor in Redis. At low volume, actual deletion occurs within roughly 25 hours of upload; backlog, job failures or missed runs can delay this further. This is eventual cleanup, not a precise one-hour TTL. An hourly schedule can reduce delay if your Vercel plan supports it. Listing/deleting uses paid service operations. Successful deletion cannot recall downloaded files or browser/CDN caches.

## Configuration

- Set a random `CRON_SECRET` of at least 16 characters in your Vercel project and local development environment. Do not commit it.
- Leave `BLOB_CLEANUP_ENABLED` unset initially: the endpoint only reports candidates.
- After testing in a dedicated development Blob/Redis store, set `BLOB_CLEANUP_ENABLED=true` in production to allow deletion. Preview deployments always dry-run. Locally, explicit enablement allows deletion in the configured store.
- Blob and Redis credentials must belong to the same environment. Missing/misconfigured Redis must not be treated as proof a room expired. A wrong but reachable Redis store can still falsely indicate expiry; use dedicated matched credentials.

No live images were deleted or scheduled externally during development. The cron configuration takes effect only after production deployment. The default configuration does not delete anything until enabled.

## Testing

1. `node --test tests/blob-cleanup/regression.cjs` checks candidate filtering, active-room preservation, dry runs, errors, pagination and authentication.
2. Run the app locally. Without an Authorization header, GET `/api/cleanup-blobs` must return 401 (503 if no secret is configured).
3. With `Authorization: Bearer YOUR_CRON_SECRET`, GET `/api/cleanup-blobs?dryRun=1`. Confirm `dryRun: true`, `deleted: 0` and the candidate counts. Do not put the secret in a URL.
4. In a development-only fixture, include an image uploaded over one hour ago with no room, a recent upload, an old upload with a live room, and an unrelated asset. Only the first should be eligible. Blob uploadedAt is server-generated; testing real age requires waiting or running mocked tests.
5. On the dedicated development store, enable cleanup and call the endpoint without the dryRun query. Confirm only eligible files are deleted; rerunning should be safe. Set the flag back to false when finished.
6. Make Redis or Blob unavailable. Cleanup should fail rather than deleting unchecked images; failed pages must be retried. Verify pagination continues across repeated calls for stores with over 500 images.
7. After deployment, confirm the daily cron appears in Vercel and inspect its logs. For an immediate dry-run audit, call the endpoint manually with its secret.

The cleanup job is independent of gameplay polling and does not alter upload paths. Results become unavailable when rooms expire; no long-term image archive is maintained. Existing permanent room records protect their images until the room-expiry fix gives those records a TTL on save or they are intentionally removed.

References: [Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [Cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
