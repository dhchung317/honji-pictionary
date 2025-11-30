// src/lib/submissionsApi.ts

export interface Submission {
  id: string;
  roomId: string;
  playerName: string;
  imageDataUrl: string; // for now, we store the data URL directly
  createdAt: string;
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