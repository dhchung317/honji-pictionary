import { Submission } from "../../shared/submission";
import { RoundScore } from "../../shared/roundscore";

export const dummySubmissions: Submission[] = [
  {
    id: "submission-1",
    roomId: "test-room",
    playerId: "player-1",
    playerName: "danny",
    imageUrl: "/test-img/cat.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "submission-2",
    roomId: "test-room",
    playerId: "player-2",
    playerName: "sarah",
    imageUrl: "/test-img/cat.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "submission-3",
    roomId: "test-room",
    playerId: "player-3",
    playerName: "mike",
    imageUrl: "/test-img/cat.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "submission-4",
    roomId: "test-room",
    playerId: "player-4",
    playerName: "jessica",
    imageUrl: "/test-img/cat.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "submission-5",
    roomId: "test-room",
    playerId: "player-5",
    playerName: "bob",
    imageUrl: "/test-img/cat.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "submission-6",
    roomId: "test-room",
    playerId: "player-6",
    playerName: "alexander_the_great",
    imageUrl: "/test-img/cat.png",
    createdAt: new Date().toISOString(),
  },
];

export const dummyRoundScore: RoundScore = {
  roomId: "test-room",
  roundId: "test-round",
  scoredAt: new Date().toISOString(),

  results: [
    {
      playerId: "player-1",
      score: 85,
      rank: 1,
      note: "A smooth criminal in jammies! This cat's got style.",
    },
    {
      playerId: "player-2",
      score: 78,
      rank: 2,
      note: "Strong idea and immediately recognizable.",
    },
    {
      playerId: "player-3",
      score: 71,
      rank: 3,
      note: "Bold interpretation with some questionable anatomy.",
    },
    {
      playerId: "player-4",
      score: 64,
      rank: 4,
      note: "The idea comes through clearly.",
    },
    {
      playerId: "player-5",
      score: 57,
      rank: 5,
      note: "Chaotic, confusing, and strangely compelling.",
    },
    {
      playerId: "player-6",
      score: 42,
      rank: 6,
      note: "The concept is there, but the execution leaves a little too much to the imagination.",
    },
  ],
};
