# Scoring recovery

## Running this review

These changes are local, based on commit `6c3fb66` on `fix-vh`. Nothing has been pushed or deployed. Use a development Redis/Blob store for failure, concurrency and limit tests; avoid exercising these against the production game.

Open the review folder in your editor. Its `node_modules` currently links to the original repo's installed dependencies. For a fresh checkout use `npm ci`. Configure the same required environment variables locally, preferably using separate development credentials. Do not commit `.env.local`. Start with `npm run api` and open the local URL it reports. If Vercel asks to link a project, choose your development project. `npm run ui` alone does not provide the server endpoints.

First play one normal game with a host browser and two players in separate browser profiles/devices: join, draw avatars, start, draw, submit, view results, quit. Reload each browser once while waiting in the lobby. Confirm that normal gameplay still works.

Automated checks use mocked services; they do not call Redis, Blob or OpenAI. Live multiplayer and hosted service integration remain manual checks.

## What changed

Scoring failures keep the round and drawings instead of marking an unscored round DONE. Up to three attempts run, separated by a 15-second cooldown. After three failures the host sees a Retry scoring button and players see a saved-drawing message. Retry resets the attempts on the SAME round and prompt. Empty rounds persist an empty result record, so their results page works. AI result IDs must exactly match the submitted player IDs. AI calls time out after 45 seconds with no hidden SDK retries.

## Test

1. Finish a normal game: rankings and results should still work.
2. In a development-only copy, force scoreRoundWithAI to fail on its first call and succeed on its second. Keep host/player tabs open and polling. Confirm a retry after the cooldown and eventual results for the original drawings.
3. Force three failures: expect SCORING_FAILED, a host Retry scoring button and a player message. Results must not be falsely marked DONE.
4. Restore successful scoring and click Retry scoring. Confirm the SAME round ID, prompt and submissions are used, and results appear.
5. Return duplicate/missing/unknown player IDs from the mocked AI output: treat it as failed scoring.
6. Let a round expire with no submissions: its results should show the empty state rather than a missing-score error.

`node --test tests/scoring-recovery/regression.cjs` checks cooldowns, bounded attempts, failure state and retry preserving the round. Mocked service tests do not verify hosted function timeout settings.

## What might break / limits

Adds SCORING_FAILED to room and round statuses; deploy frontend/backend together and test with fresh rooms. Old deployed clients cannot render that state. Retries depend on room polling and can incur up to three AI calls per batch. Manual retry starts another batch. Drawings remain subject to their existing one-hour storage expiry. Vercel function duration must allow the 45-second AI request plus storage work; verify your actual project settings. For public release combine with server permissions (retry uses start-round) and concurrency (room mutation locking). Those branches share files and may need conflict resolution.

## Integration

Independent `fix/scoring-recovery` branch for isolated review, but public release depends on `fix/mvp-server-safety`.
