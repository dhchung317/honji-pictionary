import { registerPlayer } from "./playersApi";

/** Registration owns the session token; this helper saves the returned player identity. */
export async function joinGame(nameInput: string, codeInput: string) {
  const name = nameInput.trim();
  const roomId = codeInput.trim().toUpperCase();
  if (!name || name.length > 15) throw new Error("Enter a name with 1–15 characters.");
  if (!/^[A-Z2-9]{4}$/.test(roomId)) throw new Error("Enter the four-character room code from your host.");
  const player = await registerPlayer(roomId, name);
  sessionStorage.removeItem(`submittedRound:${roomId}`);
  sessionStorage.setItem(`playerId:${roomId}`, player.id);
  sessionStorage.setItem(`playerName:${roomId}`, player.name);
  return player;
}
