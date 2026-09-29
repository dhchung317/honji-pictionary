# Concurrent writes

## Running this review

These changes are local, based on commit `6c3fb66` on `fix-vh`. Nothing has been pushed or deployed. Use a development Redis/Blob store for failure, concurrency and limit tests; avoid exercising these against the production game.

Open the review folder in your editor. Its `node_modules` currently links to the original repo's installed dependencies. For a fresh checkout use `npm ci`. Configure the same required environment variables locally, preferably using separate development credentials. Do not commit `.env.local`. Start with `npm run api` and open the local URL it reports. If Vercel asks to link a project, choose your development project. `npm run ui` alone does not provide the server endpoints.

First play one normal game with a host browser and two players in separate browser profiles/devices: join, draw avatars, start, draw, submit, view results, quit. Reload each browser once while waiting in the lobby. Confirm that normal gameplay still works.

Automated checks use mocked services; they do not call Redis, Blob or OpenAI. Live multiplayer and hosted service integration remain manual checks.

## What changed

Serializes room mutations (start, state advancement/scoring, next-round and quit) using a Redis lock released only by its owner. Locks expire after 180 seconds for crash recovery. AI calls are limited to 45 seconds with no SDK retries. Concurrent start/next/quit requests return 409; concurrent room polls return the current stored state. Submission upserts run in one Lua operation so a player has one indexed submission. Room codes are reserved with SET NX, so collisions do not overwrite games.

## Test

1. Send two start-round requests for the SAME lobby at once. Expect one successful start and one 409; only one prompt/round should be persisted.
2. During scoring, poll with several browser tabs. Confirm exactly one score is saved and no duplicate AI call occurs.
3. Send two submissions for the same player at once. List submissions: exactly one row/ID should remain. The last accepted write wins.
4. While prompt generation or scoring is deliberately delayed, send quit/next: expect 409. Retry once the first mutation finishes.
5. Trigger an exception during a mutation: a subsequent valid request must acquire the lock. Simulate an abandoned lock in DEVELOPMENT Redis: after 180 seconds the room should recover.
6. Force a repeated room-code value locally and create two rooms. The second creation must retry or fail; the original room must remain intact. Restore the generator after testing.

`node --test tests/concurrent-writes/regression.cjs` checks the concurrent start behavior using a delayed prompt. Run all server regression tests on the grouped branch. Actual Lua semantics and crash/expiry recovery require development Redis testing.

## What might break / limits

A host may need to retry a button action that receives 409. Slow model calls now fail after 45 seconds. The lock is a bounded lease, not fencing against arbitrarily delayed processes or Redis outages. Submission acceptance timing still uses the existing 30-second grace window. Before public release include the scoring-recovery branch so AI timeout failures have a clear retry path. The separate expiry fix is also needed for room cleanup.

## Integration

Third commit of `fix/mvp-server-safety`. It touches scoring files, so combining with scoring recovery may need conflict resolution; preserve the retry logic and room locks.
