import { issueSession } from "./_session.js";
import { allowRequest } from "./_limits.js";
// api/create-room.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRoom } from "./_roomStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!(await allowRequest(req, res, "create", 10, 3600))) return;
  if (!(await allowRequest(req, res, "create-global", 100, 3600, "global")))
    return;

  const hostId = String(req.body?.hostId || "").trim();

  if (!hostId) {
    return res.status(400).json({
      error: "Host id is required",
    });
  }

  try {
    const room = await createRoom(hostId);
    const sessionToken = await issueSession({
      role: "HOST",
      roomId: room.id,
      id: room.hostId,
    });
    res.status(200).json({ ...room, sessionToken });
  } catch (err) {
    console.error("[create-room] error", err);
    res.status(500).json({ error: "Failed to create room" });
  }
}
