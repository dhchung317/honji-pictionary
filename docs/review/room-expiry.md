# Room expiry

## Running this review

These changes are local, based on commit `6c3fb66` on `fix-vh`. Nothing has been pushed or deployed. Use a development Redis/Blob store for failure, concurrency and limit tests; avoid exercising these against the production game.

Open the review folder in your editor. Its `node_modules` currently links to the original repo's installed dependencies. For a fresh checkout use `npm ci`. Configure the same required environment variables locally, preferably using separate development credentials. Do not commit `.env.local`. Start with `npm run api` and open the local URL it reports. If Vercel asks to link a project, choose your development project. `npm run ui` alone does not provide the server endpoints.

First play one normal game with a host browser and two players in separate browser profiles/devices: join, draw avatars, start, draw, submit, view results, quit. Reload each browser once while waiting in the lobby. Confirm that normal gameplay still works.

Automated checks use mocked services; they do not call Redis, Blob or OpenAI. Live multiplayer and hosted service integration remain manual checks.

## What changed

Room saves preserve the remaining expiry in one Lua operation. A room with no expiry receives the one-hour default on its next save. A deleted/expired room is not recreated by a delayed update. Shortened expiry after quit is preserved.

## Test

Using DEVELOPMENT Redis:

1. Create a room; inspect PTTL for `room:CODE`: it should be positive and around one hour.
2. Set that key's TTL to 120 seconds, then start/advance the room. Its remaining TTL should continue decreasing, not reset to one hour or become permanent (-1).
3. Remove a room's expiry, then trigger a normal save: it should receive the one-hour fallback.
4. Quit a room: TTL should be about 60 seconds. A later save must not lengthen it.
5. Delete/expire a room immediately before saveRoom: it should throw an expired-update error and leave the key absent.

`node --test tests/room-expiry/regression.cjs` verifies the expired-update error path. Actual Lua behavior and TTL preservation require the Redis checks above.

## What might break / limits

Rooms now really expire one hour after creation, even if gameplay is active; updates do not extend the original deadline. Users who relied on accidentally permanent rooms need a new room. Existing permanent room keys gain expiry only when saved; this is not a bulk cleanup/migration. Redis expiry does not remove Blob images; image retention is a separate task. Late mutations can now fail instead of resurrecting expired rooms.

## Integration

Independent `fix/room-expiry` branch. Its room-store change overlaps the collision fix in `fix/mvp-server-safety`; keep both when merging.
