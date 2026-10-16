import type { RoomState } from "../../shared/roomstate";

export type RoomView =
  | "LOADING"
  | "CLOSED"
  | "LOBBY"
  | "DRAWING"
  | "SCORING"
  | "SCORING_FAILED"
  | "DONE";

export function getRoomView(state: RoomState | null | undefined): RoomView {
  if (!state) return "LOADING";
  if (state.room.closed) return "CLOSED";
  if (state.room.status === "LOBBY") return "LOBBY";
  // The room phase remains usable if round details are temporarily unavailable.
  return state.round?.status ?? state.room.status;
}
