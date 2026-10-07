import type { RoomState } from "../../shared/roomstate";

export type RoomView =
  | "LOADING"
  | "CLOSED"
  | "LOBBY"
  | "STARTING"
  | "DRAWING"
  | "SCORING"
  | "SCORING_FAILED"
  | "DONE";

export function getRoomView(state: RoomState | null | undefined): RoomView {
  if (!state) return "LOADING";
  if (state.room.closed) return "CLOSED";
  if (state.room.status === "LOBBY" || state.room.status === "STARTING")
    return state.room.status;
  // The room phase remains usable if round details are temporarily unavailable.
  return state.round?.status ?? state.room.status;
}
