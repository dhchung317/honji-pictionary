import { useEffect, useRef, useState } from "react";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { getPlayersByRoom, leaveRoom, replayPlayer } from "../lib/playersApi";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { GameErrorPage } from "../components/GameError";
import { ResultsView } from "./views/ResultsView";
import { PlayerReplayActions } from "./views/PlayerReplayActions";

import { getRoom } from "../lib/roomsApi";
import { getRoundScore } from "../lib/roundScoreApi";
import { getSubmissionsByRoom } from "../lib/submissionsApi";
import { getRankedSubmissions } from "../lib/rankedSubmissions";

import { useAsync } from "../hooks/useAsync";

import { dummyRoundScore, dummySubmissions } from "../testData/playerResults";
import { GameLoading } from "../components/GameLoading/GameLoading";

const USE_DUMMY_DATA = false;

function PlayerResults() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRound = searchParams.get("round");
  const resultRound = useRef<string | null>(null);
  const [replaying, setReplaying] = useState(false);
  const { data: live, error: liveError } = useAsync(
    async () => {
      if (!roomId) return null;
      const state = await getRoom(roomId);
      const players = await getPlayersByRoom(roomId);
      return { ...state, players };
    },
    [roomId],
    { intervalMs: 1000 },
  );
  useEffect(() => {
    if (!roomId || !live || !resultRound.current) return;
    const playerId = sessionStorage.getItem(`playerId:${roomId}`);
    const optedIn =
      replaying ||
      sessionStorage.getItem(`replayRound:${roomId}`) === resultRound.current ||
      live.players.some(
        (player) =>
          player.id === playerId &&
          player.replayRoundId === resultRound.current,
      );
    if (!optedIn || live.room.closed) return;
    if (
      live.room.status === "LOBBY" &&
      live.players.some((player) => player.id === playerId)
    )
      navigate(`/room/${roomId}/lobby`, { replace: true });
    else if (
      live.round?.status === "DRAWING" &&
      live.round.id !== resultRound.current &&
      live.round.frozenPlayerIds.includes(playerId ?? "")
    )
      navigate(`/room/${roomId}`, { replace: true });
  }, [live, replaying, roomId, navigate]);
  const {
    run: replay,
    loading: replayBusy,
    error: replayError,
  } = useAsyncAction(async () => {
    if (!roomId || !resultRound.current)
      throw new Error("Results are still loading.");
    const reply = await replayPlayer(roomId, resultRound.current);
    sessionStorage.setItem(`replayRound:${roomId}`, resultRound.current);
    setReplaying(true);
    if (!reply.waitingForHost)
      navigate(`/room/${roomId}/lobby`, { replace: true });
  });
  const {
    run: leave,
    loading: leaveBusy,
    error: leaveError,
  } = useAsyncAction(async () => {
    if (!roomId) return;
    await leaveRoom(roomId);
    navigate("/", { replace: true });
  });

  const { data, loading, error } = useAsync(async () => {
    if (USE_DUMMY_DATA) {
      return getRankedSubmissions(dummySubmissions, dummyRoundScore.results);
    }

    if (!roomId) {
      throw new Error("Missing room id");
    }

    const roomState = await getRoom(roomId);

    if (
      !requestedRound &&
      !roomState.room.closed &&
      roomState.room.status !== "DONE" &&
      roomState.room.status !== "LOBBY"
    ) {
      navigate(`/room/${roomId}`, { replace: true });
      return null;
    }
    if (
      !requestedRound &&
      roomState.room.status === "LOBBY" &&
      !roomState.room.currentRoundId
    ) {
      navigate(`/room/${roomId}/lobby`, { replace: true });
      return null;
    }
    const roundId = requestedRound || roomState.room.currentRoundId;
    if (!roundId) {
      throw new Error("NO_CURRENT_ROUND");
    }

    resultRound.current = roundId;
    const [submissions, roundScore] = await Promise.all([
      getSubmissionsByRoom(roomId, roundId),
      getRoundScore(roomId, roundId),
    ]);

    return getRankedSubmissions(submissions, roundScore.results);
  }, [roomId, requestedRound, navigate]);

  if (loading) {
    return <GameLoading message="Loading results..." />;
  }

  if (error) {
    return <GameErrorPage type={error.message} />;
  }

  if (!data) {
    return <GameLoading message="Opening your game…" />;
  }

  const missedRound = Boolean(
    live?.room.currentRoundId &&
    live.room.currentRoundId !== resultRound.current &&
    live.room.status !== "LOBBY",
  );
  const actions = (
    <PlayerReplayActions
      replay={() => void replay()}
      leave={() => void leave()}
      replayBusy={replayBusy}
      leaveBusy={leaveBusy}
      replaying={replaying}
      replayDisabled={
        replayBusy ||
        leaveBusy ||
        replaying ||
        !resultRound.current ||
        !live ||
        Boolean(liveError) ||
        Boolean(live.room.closed) ||
        missedRound
      }
      error={replayError || leaveError}
      connectionError={liveError}
      closed={Boolean(live?.room.closed)}
      missedRound={missedRound}
    />
  );
  return <ResultsView data={data} actions={actions} />;
}
export default PlayerResults;
