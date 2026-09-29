import { createHash, randomBytes } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { redis, TTL_SECONDS } from "./redis.js";
type Session = { role: "HOST" | "PLAYER"; roomId: string; id: string };
const key = (token: string) => `session:${createHash("sha256").update(token).digest("hex")}`;
export async function issueSession(session: Session) {
  const token = randomBytes(32).toString("hex");
  await redis.set(key(token), session, { ex: TTL_SECONDS });
  return token;
}
export async function authorize(req: VercelRequest, res: VercelResponse, expected: Session) {
  const header = req.headers.authorization;
  const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = /^[a-f0-9]{64}$/.test(token) ? await redis.get<Session>(key(token)) : null;
  if (!session || session.role !== expected.role || session.roomId !== expected.roomId || session.id !== expected.id) {
    res.status(403).json({ error: "This action requires your room session. Rejoin or create a new room." });
    return false;
  }
  await redis.expire(key(token), TTL_SECONDS);
  return true;
}
