import type { Room } from "./room";
import type { Round } from "./round";

export interface RoomState {
  room: Room;
  round: Round | null;
}