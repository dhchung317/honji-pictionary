import type { Room } from "./room.js";
import type { Round } from "./round.js";

export interface RoomState {
  room: Room;
  round: Round | null;
}