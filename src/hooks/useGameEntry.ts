import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/roomsApi";
import { joinGame } from "../lib/gameEntry";

type EntryAction = "HOST" | "JOIN";
export function useGameEntry() {
  const navigate = useNavigate();
  const pending = useRef(false);
  const [busy, setBusy] = useState<EntryAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function perform(action: EntryAction, work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(action);
    setError(null);
    try { await work(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to enter the game. Please try again."); }
    finally { pending.current = false; setBusy(null); }
  }
  const hostGame = () => perform("HOST", async () => {
    const room = await createRoom();
    navigate(`/host/${room.id}`);
  });
  const joinRoom = (name: string, code: string) => perform("JOIN", async () => {
    const player = await joinGame(name, code);
    navigate(`/room/${player.roomId}/lobby`);
  });
  return { busy, error, hostGame, joinRoom };
}
