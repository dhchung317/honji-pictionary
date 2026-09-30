import { randomUUID, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { redis } from "./redis.js";
import { cleanupBlobs } from "./_blobCleanup.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "Cleanup secret is not configured" });
  const supplied = Buffer.from(typeof req.headers.authorization === "string" ? req.headers.authorization : "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(Uint8Array.from(supplied), Uint8Array.from(expected))) return res.status(401).json({ error: "Unauthorized" });
  // Preview deployments always dry-run. Local deletion requires explicitly opting in.
  const dryRun = process.env.BLOB_CLEANUP_ENABLED !== "true" || req.query.dryRun === "1" || (Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production");
  const lockKey = "blob-cleanup:v1:lock";
  const owner = randomUUID();
  let acquired = false;
  try {
    acquired = await redis.set(lockKey, owner, { nx: true, ex: 180 }) === "OK";
    if (!acquired) return res.status(409).json({ error: "Cleanup already running" });
    const summary = await cleanupBlobs(dryRun);
    console.info("[blob-cleanup]", { dryRun, scanned: summary.scanned, eligible: summary.eligible, deleted: summary.deleted, hasMore: summary.hasMore });
    return res.status(200).json(summary);
  } catch (error) {
    console.error("[blob-cleanup] failed", error);
    return res.status(503).json({ error: "Cleanup incomplete; retry on the next run" });
  } finally {
    if (acquired) await redis.eval(`if redis.call("GET",KEYS[1])==ARGV[1] then return redis.call("DEL",KEYS[1]) end; return 0`, [lockKey], [owner]);
  }
}
