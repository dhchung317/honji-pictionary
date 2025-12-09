// api/create-room.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRoom } from "./_roomStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    const room = await createRoom(prompt);
    res.status(200).json(room);
  } catch (err) {
    console.error("[create-room] error", err);
    res.status(500).json({ error: "Failed to create room" });
  }
}
