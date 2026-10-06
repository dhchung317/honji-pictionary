import { sessionHeaders } from "./session";
import { Submission } from "../../shared/submission";

export async function createSubmission(input: {
  roomId: string;
  playerId: string;
  playerName: string;
  imageUrl: string;
}): Promise<Submission> {
  const res = await fetch("/api/submit-drawing", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders(input.roomId, "PLAYER") },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to submit drawing");
  return res.json();
}

export async function getSubmissionsByRoom(
  roomId: string,
  roundId?: string,
): Promise<Submission[]> {
  const res = await fetch(
    `/api/get-submissions?roomId=${encodeURIComponent(roomId)}${roundId ? `&round=${encodeURIComponent(roundId)}` : ""}`,
  );
  if (!res.ok) throw new Error("Failed to get submissions");
  return res.json();
}
