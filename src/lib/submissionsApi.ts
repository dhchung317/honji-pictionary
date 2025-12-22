import { Submission } from "../../shared/submission";

export async function createSubmission(input: {
  roomId: string;
  playerId: string;
  playerName: string;
  imageUrl: string;
}): Promise<Submission> {
  const res = await fetch("/api/submit-drawing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to submit drawing");
  return res.json();
}

export async function getSubmissionsByRoom(
  roomId: string
): Promise<Submission[]> {
  const res = await fetch(
    `/api/get-submissions?roomId=${encodeURIComponent(roomId)}`
  );
  if (!res.ok) throw new Error("Failed to get submissions");
  return res.json();
}

// export function scoreSubmissionsForRoom(roomId: string): Submission[] {
//   const all = loadAllSubmissions();
//   const normalized = roomId.trim().toLowerCase();

//   const roomSubs = all.filter(
//     (s) => s.roomId.trim().toLowerCase() === normalized
//   );

//   if (roomSubs.length === 0) {
//     console.log("[scoreSubmissionsForRoom] no submissions for room", roomId);
//     return [];
//   }

//   // if already scored (all have scores), don't rescore
//   const alreadyScored = roomSubs.every((s) => typeof s.score === "number");
//   if (alreadyScored) {
//     console.log("[scoreSubmissionsForRoom] already scored", roomId);
//     return roomSubs;
//   }

//   // Fake "AI" scoring: random scores for now
//   const scored = roomSubs
//     .map((s) => ({
//       ...s,
//       score: Math.random() * 10, // 0–10
//     }))
//     .sort((a, b) => (b.score! - a.score!)) // highest score first
//     .map((s, idx) => ({
//       ...s,
//       rank: idx + 1,
//     }));

//   // merge back into all submissions
//   const updatedAll = all.map((s) => {
//     const match = scored.find((x) => x.id === s.id);
//     return match ? match : s;
//   });

//   saveAllSubmissions(updatedAll);

//   console.log("[scoreSubmissionsForRoom] scored room", roomId, scored);
//   return scored;
// }
