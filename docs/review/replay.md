# Replay and room membership

Host results offer Play another round and Back to home. Back to home closes the room; create a new room from Home. Player results offer Play again and Leave room.

Play again records an authenticated player's intent against the completed round. Opening the next lobby removes every player who has not opted in from the active roster. Their temporary player record remains so they can rejoin the same lobby with their identity and avatar. A late replay request is accepted only before the next round starts and only for the immediately preceding round. Leaving removes the player record and name reservation.

Returning players revisit the avatar lobby, where they can draw a new avatar. The previous round remains available for results, but waiting-room polling returns no active round so a completed round cannot send the host straight back to results. Results links preserve the round id; players who miss replay see that the next round started without them.

Joining during drawing/scoring is not supported. The next round freezes only its current lobby roster. Old results, replay requests, and new joins cannot add an excluded player to it. Host reset, joins, replay, leave, and starts share the room mutation lock.

Verify with `node --test tests/replay/regression.cjs` and the full regression suite. Manually check early replay, host-first replay, two replay clicks, a missed replay, and Back to home. Refresh an old results link after another round starts: it must show the old results and prevent late replay. No live room data is changed by the tests.
