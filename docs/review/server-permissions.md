# Server permissions

## Running this review

These changes are local, based on commit `6c3fb66` on `fix-vh`. Nothing has been pushed or deployed. Use a development Redis/Blob store for failure, concurrency and limit tests; avoid exercising these against the production game.

Open the review folder in your editor. Its `node_modules` currently links to the original repo's installed dependencies. For a fresh checkout use `npm ci`. Configure the same required environment variables locally, preferably using separate development credentials. Do not commit `.env.local`. Start with `npm run api` and open the local URL it reports. If Vercel asks to link a project, choose your development project. `npm run ui` alone does not provide the server endpoints.

First play one normal game with a host browser and two players in separate browser profiles/devices: join, draw avatars, start, draw, submit, view results, quit. Reload each browser once while waiting in the lobby. Confirm that normal gameplay still works.

Automated checks use mocked services; they do not call Redis, Blob or OpenAI. Live multiplayer and hosted service integration remain manual checks.

## What changed

Opaque host/player credentials are issued when creating or joining a room. The server stores only their hashes and checks the role, room and identity before accepting host controls, drawings, avatars or upload-token requests. Browsers keep their own credential in local storage and send it as a bearer header. Failed host requests now propagate errors to the UI instead of silently appearing successful.

## Test

1. Create a NEW room and join NEW players. Pre-change sessions cannot authenticate.
2. Run the normal game checklist above, including avatar upload and timed auto-submission.
3. In a separate browser profile, open `/host/ROOM`. Starting should fail, with no new prompt generated. Sending POST requests to `/api/next-round` or `/api/quit-room` with just `{ "roomId": "ROOM" }` should return 403.
4. Remove the Authorization header from a captured submit, avatar-update or upload-token request and resend: expect 403 and no saved change.
5. Use player A's credential with player B's ID, or a credential from a different room: expect rejection. Player credentials must also be rejected for host actions.
6. Reload the host and player browsers: their own actions should continue to work.

`node --test tests/server-permissions/regression.cjs` verifies credential isolation and that an unauthorized start does not call AI.

## What might break / limits

Existing rooms need to be recreated and players need to rejoin after deploying this change. Clearing browser storage loses the session. Credentials expire after one hour without an authorized mutation; successful actions refresh them. This is room ownership, not user accounts. Spectating and room/player discovery still remain public. Uploaded drawings are still public Blob objects. Local storage does not protect against browser script injection.

## Integration

First commit of `fix/mvp-server-safety`. Usage limits and concurrency are separate later commits on that branch. Include permissions when combining the scoring-retry feature for public release, because retry uses the existing start-round endpoint.
