// src/lib/submissionsApi.ts

export interface Submission {
  id: string;
  roomId: string;
  playerName: string;
  imageDataUrl: string; // for now, we store the data URL directly
  createdAt: string;
    // scoring info (optional until scored)
  score?: number;
  rank?: number;
}

const STORAGE_KEY = "drawBattle.submissions";

function loadAllSubmissions(): Submission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Submission[];
  } catch (e) {
    console.error("Failed to parse submissions from storage", e);
    return [];
  }
}

function generateSubmissionId() {
  return Math.random().toString(36).substring(2, 10);
}

function saveAllSubmissions(submissions: Submission[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

export async function createSubmission(params: {
  roomId: string;
  playerName: string;
  imageDataUrl: string;
}): Promise<Submission> {
  // fake network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const submission: Submission = {
    id: generateSubmissionId(),
    roomId: params.roomId,
    playerName: params.playerName,
    imageDataUrl: params.imageDataUrl,
    createdAt: new Date().toISOString(),
  };

  const existing = loadAllSubmissions();
  const updated = [...existing, submission];
  saveAllSubmissions(updated);

  console.log(submission)

  return submission;
}

export async function getSubmissionsByRoom(
  roomId: string
): Promise<Submission[]> {
  // fake delay
  await new Promise((resolve) => setTimeout(resolve, 200));
    const all = loadAllSubmissions();
  const filtered = all.filter((s) => s.roomId === roomId);
  console.log(
    `[getSubmissionsByRoom] roomId=${roomId}, count=${filtered.length}`
  );
  return filtered;
}

export function scoreSubmissionsForRoom(roomId: string): Submission[] {
  const all = loadAllSubmissions();
  const normalized = roomId.trim().toLowerCase();

  const roomSubs = all.filter(
    (s) => s.roomId.trim().toLowerCase() === normalized
  );

  if (roomSubs.length === 0) {
    console.log("[scoreSubmissionsForRoom] no submissions for room", roomId);
    return [];
  }

  // if already scored (all have scores), don't rescore
  const alreadyScored = roomSubs.every((s) => typeof s.score === "number");
  if (alreadyScored) {
    console.log("[scoreSubmissionsForRoom] already scored", roomId);
    return roomSubs;
  }

  // Fake "AI" scoring: random scores for now
  const scored = roomSubs
    .map((s) => ({
      ...s,
      score: Math.random() * 10, // 0–10
    }))
    .sort((a, b) => (b.score! - a.score!)) // highest score first
    .map((s, idx) => ({
      ...s,
      rank: idx + 1,
    }));

  // merge back into all submissions
  const updatedAll = all.map((s) => {
    const match = scored.find((x) => x.id === s.id);
    return match ? match : s;
  });

  saveAllSubmissions(updatedAll);

  console.log("[scoreSubmissionsForRoom] scored room", roomId, scored);
  return scored;
}