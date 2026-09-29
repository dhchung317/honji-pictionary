# Preserve drawings

## Running this review

These changes are local, based on commit `6c3fb66` on `fix-vh`. Nothing has been pushed or deployed. Use a development Redis/Blob store for failure, concurrency and limit tests; avoid exercising these against the production game.

Open the review folder in your editor. Its `node_modules` currently links to the original repo's installed dependencies. For a fresh checkout use `npm ci`. Configure the same required environment variables locally, preferably using separate development credentials. Do not commit `.env.local`. Start with `npm run api` and open the local URL it reports. If Vercel asks to link a project, choose your development project. `npm run ui` alone does not provide the server endpoints.

First play one normal game with a host browser and two players in separate browser profiles/devices: join, draw avatars, start, draw, submit, view results, quit. Reload each browser once while waiting in the lobby. Confirm that normal gameplay still works.

Automated checks use mocked services; they do not call Redis, Blob or OpenAI. Live multiplayer and hosted service integration remain manual checks.

## What changed

Temporary room-poll failures show a reconnecting message while keeping the game and avatar canvases mounted. Initial load errors and confirmed room-not-found responses still display an error page. The polling hook allows only one request in flight, avoiding stale overlapping responses. Submit is disabled while uploading or when the round is no longer drawing.

## Test

1. Draw something recognizable in a new round. In browser developer tools block ONLY `/api/get-room` requests for 10 seconds. The drawing must stay visible, the warning must appear, and you should still be able to draw.
2. Unblock requests. The warning should disappear; the drawing and undo history must remain. Submit it and confirm results use that drawing.
3. Repeat in the avatar lobby; the avatar drawing must remain.
4. Make one get-room response take longer than three seconds. Confirm polling does not pile up requests.
5. Load a nonexistent room and load a room from scratch while offline: expect the usual error screen.
6. Double-click Submit during an upload: the button should disable. If submission fails, restore connectivity and retry manually within the grace window.

Frontend TypeScript and production build are the automated checks for this UI change. The browser steps above remain necessary.

## What might break / limits

This preserves an in-memory drawing during polling failures; it does not save drafts across refresh, closed tabs, navigation or browser crashes. The round timer continues during connection failures. A failure lasting beyond the 30-second submission grace window can still lose the opportunity to submit. Confirmed room expiry intentionally removes the canvas. Very slow polls delay later polls rather than allowing overlap; fetch timeout/backoff is not added in this fix.

## Integration

Independent `fix/preserve-drawings` branch. It shares JoinRoom.tsx with permissions and scoring recovery. Keep their upload headers and scoring-failure message when resolving conflicts.
