import { VercelRequest, VercelResponse } from "@vercel/node";
import { redis as kv } from "./redis.js";
import { getRoomById, saveRoom } from "./_roomStore.js";
import { listSubmissions, submissionUniqKey } from "./_submissionStore.js";
import { Room } from "../shared/room.js";
import { scoreRoundWithAI } from "./_aiScoreRound.js";

async function allFrozenSubmitted(room: Room): Promise<boolean> {
  const frozen = room.frozenPlayerIds ?? [];
  if (frozen.length === 0) return true; // or false if you want to require at least 1

  const subIds = await Promise.all(
    frozen.map((pid) =>
      kv.get<string>(submissionUniqKey(room.id, room.roundId, pid))
    )
  );

  return subIds.every((x) => typeof x === "string" && x.length > 0);
}

function isRoundTimedOut(room: Room, nowMs: number): boolean {
  if (!room.roundEndAt) return false;
  return nowMs >= Date.parse(room.roundEndAt);
}

function makeFakeRanking(playerIds: string[]): string[] {
  // If you want deterministic (same every time) without storing: sort.
  // If you want "random" but stable for the round: you MUST store the result.
  return [...playerIds].sort();
}

async function advanceRoomIfNeeded(room: Room): Promise<Room> {
  const nowMs = Date.now();
  if (room.status === "DRAWING") {
    const timedOut = isRoundTimedOut(room, nowMs);
    const everyoneSubmitted = await allFrozenSubmitted(room); // you already have this

    if (!timedOut && !everyoneSubmitted) return room;

    // Enter SCORING: compute a stable ranking ONCE
    const ranked =
      room.rankedPlayerIds && room.rankedPlayerIds.length > 0
        ? room.rankedPlayerIds
        : makeFakeRanking(room.frozenPlayerIds); // deterministic or random

    const updated: Room = {
      ...room,
      status: "SCORING",
      rankedPlayerIds: ranked,
      scoredAt: null,
    };

    await saveRoom(updated);
    return updated;
  }

  if (room.status === "SCORING" && !room.scoredAt) {
    try {
      const subs = await listSubmissions(room.id, room.roundId); // uses your new namespacing
      const result = await scoreRoundWithAI({
        prompt: room.prompt,
        submissions: subs.map((s) => ({
          playerId: s.playerId,
          playerName: s.playerName,
          imageUrl: s.imageUrl,
        })),
      });

      room.rankedPlayerIds = result?.rankedPlayerIds ?? [];
      room.scoreNotesByPlayerId = result?.notesByPlayerId ?? null;
      room.scoredAt = new Date().toISOString();
      room.status = "DONE";
      await saveRoom(room);
    } catch (e) {
      // Fail closed: keep game moving
      room.rankedPlayerIds = [...room.frozenPlayerIds]; // deterministic fallback
      room.scoredAt = new Date().toISOString();
      room.status = "DONE";
      await saveRoom(room);
    }
  }

  return room;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const roomId = String(req.body?.roomId || "").trim();
  if (!roomId) {
    res.status(400).json({ error: "Room id is required" });
    return;
  }

  const room = await getRoomById(roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  try {
    const advanced = await advanceRoomIfNeeded(room);
    res.status(200).json(advanced);
  } catch (err) {
    console.error("[get-room] advance error", err);
    // Fall back to returning the room we have rather than hard failing
    res.status(200).json(room);
  }
}
