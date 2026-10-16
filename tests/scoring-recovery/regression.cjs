const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../..");
function load(file, mocks = {}) {
  const source = readFileSync(path.join(root, file), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (id) =>
      id in mocks
        ? mocks[id]
        : id === "./_lobbyReady.js"
          ? { syncLobbyCountdown: async (room) => room }
          : id === "./_deferredResponse.js"
            ? load("api/_deferredResponse.ts")
            : require(id),
    crypto: crypto.webcrypto,
    Date,
    console: { ...console, error() {} },
    setTimeout,
    clearTimeout,
    URL,
  };
  vm.runInNewContext(code, sandbox, { filename: file });
  return module.exports;
}
function response() {
  return {
    code: 200,
    headersSent: false,
    status(n) {
      this.code = n;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
    setHeader() {},
  };
}
test("failed scoring retries then exposes failure, retaining drawings for a manual retry", async () => {
  let room = { id: "ABCD", status: "SCORING", currentRoundId: "round" };
  let round = {
    id: "round",
    roomId: "ABCD",
    status: "SCORING",
    prompt: "cat",
    scoredAt: null,
    scoringAttempts: 0,
  };
  let attempts = 0;
  const scores = [];
  const handler = load("api/get-room.ts", {
    "./_mutationLock.js": { acquireRoomMutation: async () => async () => {} },
    "./redis.js": { redis: { set: async () => "OK", del: async () => {} } },
    "./_roomStore.js": {
      getRoomById: async () => room,
      saveRoom: async (v) => {
        room = v;
      },
    },
    "./_roundStore.js": {
      getRound: async () => round,
      saveRound: async (v) => {
        round = v;
      },
    },
    "./_submissionStore.js": {
      listSubmissions: async () => [
        { playerId: "p", playerName: "Pat", imageUrl: "image" },
      ],
    },
    "./_aiScoreRound.js": {
      scoreRoundWithAI: async () => {
        attempts++;
        throw Error("unavailable");
      },
    },
    "./_roundScoreStore.js": { saveRoundScore: async (v) => scores.push(v) },
    "./shared.js": { GRACE_MS: 30000 },
  }).default;
  const req = { method: "GET", query: { roomId: "ABCD" } };
  await handler(req, response());
  assert.equal(room.status, "SCORING");
  assert.equal(attempts, 1);
  await handler(req, response());
  assert.equal(attempts, 1);
  round.scoringRetryAt = 0;
  await handler(req, response());
  round.scoringRetryAt = 0;
  await handler(req, response());
  assert.equal(room.status, "SCORING_FAILED");
  assert.equal(round.scoredAt, null);
  assert.equal(scores.length, 0);
  await handler(req, response());
  assert.equal(attempts, 3);
  const restart = load("api/start-round.ts", {
    "./_mutationLock.js": { acquireRoomMutation: async () => async () => {} },
    "./_session.js": { authorize: async () => true },
    "./_limits.js": { allowRequest: async () => true },
    "./_roomStore.js": {
      getRoomById: async () => room,
      saveRoom: async (v) => {
        room = v;
      },
    },
    "./_roundStore.js": {
      getRound: async () => round,
      saveRound: async (v) => {
        round = v;
      },
    },
    "./_playerStore.js": {},
    "./_aiGeneratePrompt.js": {
      genPrompt: () => {
        throw Error("must preserve prompt");
      },
    },
  }).default;
  await restart({ method: "POST", body: { roomId: "ABCD" } }, response());
  assert.equal(room.status, "SCORING");
  assert.equal(round.id, "round");
  assert.equal(round.scoringAttempts, 0);
});
