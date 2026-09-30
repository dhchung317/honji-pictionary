import { list, del, type ListBlobResultBlob } from "@vercel/blob";
import { redis } from "./redis.js";
import type { Room } from "../shared/room.js";

export const BLOB_RETENTION_MS = 60 * 60 * 1000;
const gamePath = /^room\/([A-Z2-9]{4})\/(?:players\/[a-f0-9-]{36}\/avatar(?:-[A-Za-z0-9]+)?\.png|round\/[a-f0-9-]{36}\/players\/[a-f0-9-]{36}(?:-[A-Za-z0-9]+)?\.png)$/;
export function expiredGameBlob(blob: Pick<ListBlobResultBlob, "pathname" | "uploadedAt">, now: number) {
  const match = gamePath.exec(blob.pathname);
  const uploadedAt = new Date(blob.uploadedAt).getTime();
  return match && Number.isFinite(uploadedAt) && uploadedAt <= now - BLOB_RETENTION_MS ? match[1] : null;
}

export async function cleanupBlobs(dryRun: boolean, now = Date.now()) {
  const cursorKey = `blob-cleanup:v1:${dryRun ? "dry" : "live"}:cursor`;
  let cursor = await redis.get<string>(cursorKey) ?? undefined;
  const deadline = Date.now() + 60_000;
  const summary = { dryRun, scanned: 0, eligible: 0, deleted: 0, hasMore: false, examples: [] as string[] };
  // Bounded work; persist pagination so large stores don't starve later paths.
  for (let page = 0; page < 5 && Date.now() < deadline; page++) {
    const result = await list({ prefix: "room/", limit: 100, cursor, abortSignal: AbortSignal.timeout(10_000) });
    summary.scanned += result.blobs.length;
    const old = result.blobs.map(blob => ({ blob, roomId: expiredGameBlob(blob, now) })).filter(item => item.roomId !== null);
    const ids = [...new Set(old.map(item => item.roomId!))];
    // Failure of the room lookup aborts the page: never interpret Redis failure as expiry.
    const rooms = ids.length ? await redis.mget<Array<Room | null>>(...ids.map(id => `room:${id}`)) : [];
    if (rooms.length !== ids.length) throw new Error("Incomplete room lookup");
    const expiredRooms = new Set(ids.filter((_id, index) => rooms[index] === null));
    const candidates = old.filter(item => expiredRooms.has(item.roomId!)).map(item => item.blob);
    summary.eligible += candidates.length;
    summary.examples.push(...candidates.slice(0, 20 - summary.examples.length).map(blob => blob.pathname));
    if (!dryRun && candidates.length) {
      await del(candidates.map(blob => blob.url), { abortSignal: AbortSignal.timeout(10_000) });
      summary.deleted += candidates.length;
    }
    summary.hasMore = result.hasMore;
    if (!result.hasMore) {
      await redis.del(cursorKey);
      break;
    }
    if (!result.cursor) throw new Error("Missing Blob pagination cursor");
    cursor = result.cursor;
    // Advance only after this page was successfully processed. Failed deletes retry next run.
    await redis.set(cursorKey, cursor);
  }
  return summary;
}
