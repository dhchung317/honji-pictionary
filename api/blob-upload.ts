import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById } from "./_roomStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req as any, // VercelRequest isn't a Fetch Request, but this works in Node runtime

      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : null;
        const { roomId, round, playerId } = payload ?? {};

        if (!roomId || round === undefined || !playerId) {
          throw new Error("Missing clientPayload");
        }

        const room = await getRoomById(roomId);
        if (!room) throw new Error("Room not found");

        const end = new Date(room.roundEndAt!).getTime();
        const GRACE_MS = 20000;

        const now = Date.now();
        const withinGrace = now <= end + GRACE_MS;
        // Same rules as submit-drawing:
        if (!withinGrace)
          throw new Error("Round not accepting uploads");
        if (room.roundId !== round) throw new Error("Wrong round");
        if (!room.frozenPlayerIds.includes(playerId))
          throw new Error("Not in this round");

        const safePath = `rooms/${roomId}/rounds/${round}/players/${playerId}.png`;

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: true,
          // callbackUrl: 'https://example.com/api/avatar/upload',
          // optional, `callbackUrl` is automatically computed when hosted on Vercel
          tokenPayload: JSON.stringify({
            roomId,
            round,
            playerId,
            safePath,
          }),
          // optional, sent to your server on upload completion
          // you could pass a user id from auth, or a value from clientPayload
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: don’t rely on this locally unless you tunnel
        console.log("blob upload completed", blob.url, tokenPayload);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
