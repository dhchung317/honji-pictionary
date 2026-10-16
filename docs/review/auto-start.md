# Lobby readiness and automatic starts

This branch builds on `feature/replay`. Every active lobby player can toggle ready/unready on the avatar page. When at least one player is present and everyone is ready, the server saves a five-second deadline. The host and players display the countdown; the host screen submits the automatic start request at the exact deadline. Keep the host page open. If it is reloaded after the deadline, it resumes the pending start. Manual Start Round remains available when no countdown is running and as a fallback after an automatic-start failure.

Unready, a new join, and an unready late replayer cancel the deadline. Leaving an unready player can make the remaining roster all-ready. Repeated ready updates do not extend a running countdown. Replay resets readiness and advances the lobby version; delayed requests from the old lobby are rejected.

Readiness, roster changes, and starts use the room mutation lock. The server checks the roster, lobby version, and deadline again before generating a prompt for an automatic start. An empty room never starts. Once prompt generation starts under the lock, the start is committed and readiness changes are rejected until the request finishes.

Tests: `node --test tests/auto-start/*.cjs`, then `node --test tests/*/*.cjs`. Browser-check one host and multiple player tabs: ready everyone; unready during the countdown; join during the countdown; leave an unready player; replay before/after the host resets; and refresh the host during a countdown. The timer test includes the subsecond window where the displayed countdown is zero but the server deadline is still in the future.
