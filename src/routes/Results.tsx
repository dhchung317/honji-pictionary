import { useEffect } from "react";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { nextRound, quit } from "../lib/roomsApi";
import { useNavigate, useParams } from "react-router-dom";

import { GameErrorPage } from "../components/GameError";
import { ResultsView } from "./views/ResultsView";

import { useAsync } from "../hooks/useAsync";

import { getRoundScore } from "../lib/roundScoreApi";
import { getRoom } from "../lib/roomsApi";
import { getSubmissionsByRoom } from "../lib/submissionsApi";
import { getRankedSubmissions } from "../lib/rankedSubmissions";
import { dummyRoundScore, dummySubmissions } from "../testData/playerResults";

import { HostReplayActions } from "./views/HostReplayActions";
import { GameLoading } from "../components/GameLoading/GameLoading";

const USE_DUMMY_DATA = false;

function Results() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    run: replay,
    loading: replayBusy,
    error: replayError,
  } = useAsyncAction(async () => {
    if (!roomId) return;
    await nextRound(roomId);
    navigate(`/host/${roomId}`, { replace: true });
  });
  const {
    run: home,
    loading: homeBusy,
    error: homeError,
  } = useAsyncAction(async () => {
    if (!roomId) return;
    await quit(roomId);
    navigate("/", { replace: true });
  });
  const actions = (
    <HostReplayActions
      replay={replay}
      home={home}
      replayBusy={replayBusy}
      homeBusy={homeBusy}
      replayError={replayError}
      homeError={homeError}
    />
  );

  const {
    data: roomState,
    loading: roomLoading,
    error: roomError,
  } = useAsync(() => getRoom(roomId!), [roomId], { intervalMs: 3000 });
  const roundId = roomState?.room.currentRoundId;
  const showingResults =
    roomState?.room.closed || roomState?.room.status === "DONE";
  useEffect(() => {
    if (roomId && roomState && !showingResults)
      navigate(`/host/${roomId}`, { replace: true });
  }, [roomId, roomState, showingResults, navigate]);

  const { data, loading, error } = useAsync(async () => {
    if (USE_DUMMY_DATA)
      return getRankedSubmissions(dummySubmissions, dummyRoundScore.results);
    if (!showingResults || !roundId || !roomId) return null;
    const [submissions, roundScore] = await Promise.all([
      getSubmissionsByRoom(roomId, roundId),
      getRoundScore(roomId, roundId),
    ]);
    return getRankedSubmissions(submissions, roundScore.results);
  }, [roomId, roundId, showingResults]);

  if (roomError && (!roomState || roomError.message === "ROOM_NOT_FOUND"))
    return <GameErrorPage type={roomError.message} />;
  if (roomLoading || !showingResults)
    return <GameLoading message="Opening your game…" />;

  if (loading) {
    return <GameLoading message="Loading results..." />;
  }

  if (error) {
    return <GameErrorPage type={error.message} />;
  }

  if (!data) {
    return <GameLoading message="Loading results…" />;
  }

  return (
    <ResultsView
      data={data}
      actions={
        <>
          {roomError && (
            <p role="status">Connection interrupted. Reconnecting…</p>
          )}
          {roomState?.room.closed ? (
            <p role="status">This room is closed.</p>
          ) : (
            actions
          )}
        </>
      }
      host
    />
  );
}
export default Results;
