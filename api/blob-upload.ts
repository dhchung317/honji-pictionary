import { authorize } from "./_session.js";
import { allowRequest } from "./_limits.js";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getRoomById } from "./_roomStore.js";
import { getRound } from "./_roundStore.js";
import { listPlayers } from "./_playerStore.js";
import { GRACE_MS } from "./shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req as any,

      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : null;

        const { roomId, roundId, playerId, type } = payload ?? {};

        if (!roomId || !playerId) {
          throw new Error("Missing clientPayload");
        }

        const room = await getRoomById(roomId);

        if (!room) {
          throw new Error("Room not found");
        }

        if (
          !(await authorize(req, res, { role: "PLAYER", roomId, id: playerId }))
        ) {
          throw new Error("Invalid player session");
        }

        if (
          !(await allowRequest(
            req,
            res,
            "upload",
            6,
            60,
            `${roomId}:${playerId}`,
          ))
        )
          throw new Error("Upload limit reached");
        if (!(await allowRequest(req, res, "upload-room", 60, 60, roomId)))
          throw new Error("Room upload limit reached");

        /* ---------- Avatar upload ---------- */

        if (type === "avatar") {
          if (room.status !== "LOBBY") {
            throw new Error(
              "Avatars can only be uploaded while waiting in the lobby",
            );
          }

          const players = await listPlayers(roomId);

          const player = players.find((player) => player.id === playerId);

          if (!player) {
            throw new Error("Player not found in room");
          }

          const safePath = `room/${roomId}/players/${playerId}/avatar.png`;

          if (pathname !== safePath) throw new Error("Invalid upload path");
          return {
            maximumSizeInBytes: 2 * 1024 * 1024,
            validUntil: Date.now() + 60_000,
            allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],

            addRandomSuffix: true,

            tokenPayload: JSON.stringify({
              type: "avatar",
              roomId,
              playerId,
              safePath,
            }),
          };
        }

        /* ---------- Round submission ---------- */

        if (roundId === undefined) {
          throw new Error("Missing round id");
        }

        if (!room.currentRoundId) {
          throw new Error("Round id not found");
        }

        const round = await getRound(roomId, room.currentRoundId);

        if (!round) {
          throw new Error("Round not found");
        }

        if (round.id !== roundId) {
          throw new Error("Invalid round");
        }

        const end = new Date(round.roundEndAt!).getTime();

        const now = Date.now();

        const withinGrace = now <= end + GRACE_MS;

        if (!withinGrace) {
          throw new Error("Round not accepting uploads");
        }

        if (!round.frozenPlayerIds.includes(playerId)) {
          throw new Error("Not in this round");
        }

        const safePath = `room/${roomId}/round/${roundId}/players/${playerId}.png`;

        if (pathname !== safePath) throw new Error("Invalid upload path");
        return {
          maximumSizeInBytes: 2 * 1024 * 1024,
          validUntil: Date.now() + 60_000,
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],

          addRandomSuffix: true,

          tokenPayload: JSON.stringify({
            type: "submission",
            roomId,
            roundId,
            playerId,
            safePath,
          }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("blob upload completed", blob.url, tokenPayload);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    if (res.headersSent) return;
    return res.status(400).json({
      error: (error as Error).message,
    });
  }
}
