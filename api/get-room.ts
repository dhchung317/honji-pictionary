import { VercelRequest, VercelResponse } from "@vercel/node";
import { redis as kv, redis } from "./redis.js";
import { getRoomById, saveRoom } from "./_roomStore.js";
import { listSubmissions, submissionUniqKey } from "./_submissionStore.js";
import { Room } from "../shared/room.js";
import { scoreRoundWithAI } from "./_aiScoreRound.js";
import { RoundScore } from "../shared/roundscore.js";
import { saveRoundScore } from "./_roundScoreStore.js";
import { GRACE_MS } from "./shared.js";
import { Round } from "../shared/round.js";
import { getRound, saveRound } from "./_roundStore.js";

const scoringLockKey = (roomId: string, roundId: string) =>
  `room:${roomId}:round:${roundId}:scoring-lock`;

async function acquireScoringLock(
  roomId: string,
  roundId: string,
): Promise<boolean> {
  const result = await redis.set(scoringLockKey(roomId, roundId), "1", {
    nx: true,
    ex: 60,
  });

  return result === "OK";
}

async function allFrozenSubmitted(room: Room, round: Round): Promise<boolean> {
  const frozen = round.frozenPlayerIds;

  if (frozen.length === 0) return true; // or false if you want to require at least 1

  const subIds = await Promise.all(
    frozen.map((pid) =>
      kv.get<string>(submissionUniqKey(room.id, round.id, pid)),
    ),
  );

  return subIds.every((x) => typeof x === "string" && x.length > 0);
}

function isSubmissionGraceExpired(round: Round, nowMs = Date.now()): boolean {
  const endMs = new Date(round.roundEndAt).getTime();

  return nowMs >= endMs + GRACE_MS;
}

async function advanceRoomIfNeeded(
  room: Room,
  round: Round | null,
): Promise<Room> {
  if (!round) return room;

  if (round.status === "DRAWING") {
    return advanceDrawingRoom(room, round);
  }

  if (round.status === "SCORING") {
    return advanceScoringRoom(room, round);
  }

  return room;
}

async function advanceDrawingRoom(room: Room, round: Round): Promise<Room> {
  const everyoneSubmitted = await allFrozenSubmitted(room, round);
  const graceExpired = isSubmissionGraceExpired(round);

  if (!everyoneSubmitted && !graceExpired) {
    return room;
  }

  const updatedRound: Round = {
    ...round,
    status: "SCORING",
  };

  await saveRound(updatedRound);

  const updatedRoom: Room = {
    ...room,
    status: "SCORING",
  };

  await saveRoom(updatedRoom);

  return updatedRoom;
}

async function finishRound(room: Room, round: Round): Promise<Room> {
  const scoredAt = new Date().toISOString();

  const updatedRound: Round = {
    ...round,
    status: "DONE",
    scoredAt,
  };

  await saveRound(updatedRound);

  const updatedRoom: Room = {
    ...room,
    status: "DONE",
  };

  await saveRoom(updatedRoom);

  return updatedRoom;
}

async function advanceScoringRoom(room: Room, round: Round): Promise<Room> {
  if (round.scoredAt) {
    return room;
  }
  const acquired = await acquireScoringLock(room.id, round.id ?? "");

  if (!acquired) return room;

  try {
    const subs = await listSubmissions(room.id, round.id ?? "");

    if (subs.length !== 0) {
      const result = await scoreRoundWithAI({
        prompt: round.prompt ?? "",
        submissions: subs.map((s) => ({
          playerId: s.playerId,
          playerName: s.playerName,
          imageUrl: s.imageUrl,
        })),
      });

      const roundScore: RoundScore = {
        roomId: room.id,
        roundId: round.id ?? "",
        scoredAt: new Date().toISOString(),
        results: result.notes.map((r) => ({
          playerId: r.playerId,
          score: r.score,
          note: r.note,
          rank: result.rankedPlayerIds.indexOf(r.playerId) + 1,
        })),
      };

      await saveRoundScore(roundScore);
    }

    return finishRound(room, round);
  } catch (error) {
    console.error("[SCORING FAILED]", error);

    return finishRound(room, round);
  } finally {
    await redis.del(scoringLockKey(room.id, round.id));
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const roomId = String(req.query?.roomId || "").trim();

  if (!roomId) {
    return res.status(400).json({
      error: "Room id is required",
    });
  }

  try {
    const room = await getRoomById(roomId);

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    let round = room.currentRoundId
      ? await getRound(room.id, room.currentRoundId)
      : null;

    const advancedRoom = await advanceRoomIfNeeded(room, round);

    // Advancement may have changed the Round itself.
    if (advancedRoom.currentRoundId) {
      round = await getRound(advancedRoom.id, advancedRoom.currentRoundId);
    }

    return res.status(200).json({
      room: advancedRoom,
      round,
    });
  } catch (err) {
    console.error("[get-room] error", err);

    return res.status(500).json({
      error: "Failed to get room",
    });
  }
}
