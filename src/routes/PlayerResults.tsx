import { useEffect, useRef, useState } from "react";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { getPlayersByRoom, leaveRoom, replayPlayer } from "../lib/playersApi";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { GameErrorPage } from "../components/GameError";
import { SubmissionCard } from "../components/SubmissionCard/SubmissionCard";

import { getRoom } from "../lib/roomsApi";
import { getRoundScore } from "../lib/roundScoreApi";
import { getSubmissionsByRoom } from "../lib/submissionsApi";
import { getRankedSubmissions } from "../lib/rankedSubmissions";

import { useAsync } from "../hooks/useAsync";

import { dummyRoundScore, dummySubmissions } from "../testData/playerResults";
import { GameLoading } from "../components/GameLoading/GameLoading";

import styles from "./PlayerResults.module.css";

const USE_DUMMY_DATA = false;

function PlayerResults() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRound = searchParams.get("round");
  const resultRound = useRef<string | null>(null);
  const [replaying, setReplaying] = useState(false);
  const { data: live } = useAsync(async () => {
    if (!roomId) return null;
    const state = await getRoom(roomId);
    const players = await getPlayersByRoom(roomId);
    return { ...state, players };
  }, [roomId], { intervalMs: 1000 });
  useEffect(() => {
    if (!roomId || !live || !resultRound.current) return;
    const playerId = sessionStorage.getItem(`playerId:${roomId}`);
    const optedIn = replaying || sessionStorage.getItem(`replayRound:${roomId}`) === resultRound.current || live.players.some(player => player.id === playerId && player.replayRoundId === resultRound.current);
    if (!optedIn || live.room.closed) return;
    if (live.room.status === "LOBBY" && live.players.some(player => player.id === playerId)) navigate(`/room/${roomId}/lobby`, { replace: true });
    else if (live.round?.status === "DRAWING" && live.round.id !== resultRound.current && live.round.frozenPlayerIds.includes(playerId ?? "")) navigate(`/room/${roomId}`, { replace: true });
  }, [live, replaying, roomId, navigate]);
  const { run: replay, loading: replayBusy, error: replayError } = useAsyncAction(async () => {
    if (!roomId || !resultRound.current) throw new Error("Results are still loading.");
    const reply = await replayPlayer(roomId, resultRound.current);
    sessionStorage.setItem(`replayRound:${roomId}`, resultRound.current);
    setReplaying(true);
    if (!reply.waitingForHost) navigate(`/room/${roomId}/lobby`, { replace: true });
  });
  const { run: leave, loading: leaveBusy, error: leaveError } = useAsyncAction(async () => {
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
  }, [roomId, requestedRound]);

  if (loading) {
    return <GameLoading message="Loading results..." />;
  }

  if (error) {
    return <GameErrorPage type={error.message} />;
  }

  if (!data) {
    return null;
  }

  if (data.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>Results</h1>
          <p>No submissions yet.</p>
          <div className={styles.replayActions}>
          <button type="button" onClick={() => void replay()} disabled={replayBusy || leaveBusy || replaying || !resultRound.current || live?.room.closed || (live?.room.status !== "LOBBY" && Boolean(live?.room.currentRoundId && live.room.currentRoundId !== resultRound.current))}>{replaying ? "Waiting for the host…" : replayBusy ? "Joining…" : "Play again"}</button>
          <button type="button" onClick={() => void leave()} disabled={replayBusy || leaveBusy}>{leaveBusy ? "Leaving…" : "Leave room"}</button>
          {(replayError || leaveError) && <p role="alert">{(replayError || leaveError)?.message}</p>}
          {live?.room.currentRoundId && live.room.currentRoundId !== resultRound.current && live.room.status !== "LOBBY" && <p role="status">This round has started without you. Return home to join a future lobby.</p>}
          {live?.room.closed && <p role="status">The host has closed this room.</p>}
        </div>
        </section>
      </main>
    );
  }

  const winner = data[0];

  return (
    <main className={styles.page}>
      <div className={styles.results}>
        <header className={styles.header}>
          <h1 className={styles.title}>Results</h1>
        </header>

        <div className={styles.replayActions}>
          <button type="button" onClick={() => void replay()} disabled={replayBusy || leaveBusy || replaying || !resultRound.current || live?.room.closed || (live?.room.status !== "LOBBY" && Boolean(live?.room.currentRoundId && live.room.currentRoundId !== resultRound.current))}>{replaying ? "Waiting for the host…" : replayBusy ? "Joining…" : "Play again"}</button>
          <button type="button" onClick={() => void leave()} disabled={replayBusy || leaveBusy}>{leaveBusy ? "Leaving…" : "Leave room"}</button>
          {(replayError || leaveError) && <p role="alert">{(replayError || leaveError)?.message}</p>}
          {live?.room.currentRoundId && live.room.currentRoundId !== resultRound.current && live.room.status !== "LOBBY" && <p role="status">This round has started without you. Return home to join a future lobby.</p>}
          {live?.room.closed && <p role="status">The host has closed this room.</p>}
        </div>
        <div className={styles.resultsLayout}>
          <section className={styles.winnerSection}>
            <SubmissionCard
              submission={winner.submission}
              result={winner.result}
            />
          </section>

          <section className={styles.submissionsSection} tabIndex={0} aria-label="Other players’ results">
            {/* Desktop */}
            <div className={styles.desktopSubmissions}>
              {data.slice(1).map(({ submission, result }) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  result={result}
                />
              ))}
            </div>

          </section>
        </div>
      </div>
    </main>
  );
}

export default PlayerResults;
