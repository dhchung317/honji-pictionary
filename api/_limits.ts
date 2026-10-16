import { createHash } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { redis } from "./redis.js";
export async function allowRequest(
  req: VercelRequest,
  res: VercelResponse,
  action: string,
  limit: number,
  seconds: number,
  scope?: string,
) {
  const address =
    req.headers["x-vercel-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "unknown";
  const id = createHash("sha256")
    .update(scope ?? String(address))
    .digest("hex");
  try {
    const count = await redis.eval<[number], number>(
      `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`,
      [`limit:${action}:${id}`],
      [seconds],
    );
    if (count <= limit) return true;
    res.setHeader("Retry-After", String(seconds));
    res
      .status(429)
      .json({ error: "Too many requests. Please try again later." });
  } catch {
    res
      .status(503)
      .json({ error: "Unable to check request limits. Please try again." });
  }
  return false;
}
export function validImageUrl(value: string, prefix: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      decodeURIComponent(url.pathname).startsWith(`/${prefix}`)
    );
  } catch {
    return false;
  }
}
