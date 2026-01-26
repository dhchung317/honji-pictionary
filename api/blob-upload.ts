import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getRoomById } from "./_roomStore.js";

export default async function handler(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : null;
        const { roomId, round, playerId } = payload ?? {};

        if (!roomId || round === undefined || !playerId) {
          throw new Error("Missing clientPayload");
        }

        const room = await getRoomById(roomId);
        if (!room) throw new Error("Room not found");

        // Same rules as submit-drawing:
        if (room.status !== "DRAWING")
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
        // Called by Vercel API on client upload completion
        // Use tools like ngrok if you want this to work locally

        console.log("blob upload completed", blob, tokenPayload);

        try {
          // Run any logic after the file upload completed
          // const { userId } = JSON.parse(tokenPayload);
          // await db.update({ avatar: blob.url, userId });
        } catch (error) {
          throw new Error("Could not update user");
        }
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 } // The webhook will retry 5 times waiting for a 200
    );
  }
}
