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
test("a second concurrent start is rejected before prompt generation", async () => {
  let locked = false,
    calls = 0,
    finish;
  const pending = new Promise((resolve) => (finish = resolve));
  const handler = load("api/start-round.ts", {
    "./_session.js": { authorize: async () => true },
    "./_limits.js": { allowRequest: async () => true },
    "./_mutationLock.js": {
      acquireRoomMutation: async () => {
        if (locked) return null;
        locked = true;
        return async () => {
          locked = false;
        };
      },
    },
    "./_roomStore.js": {
      getRoomById: async () => ({
        id: "ABCD",
        status: "LOBBY",
        drawingDurationMs: 180000,
        promptHistory: [],
      }),
      saveRoom: async () => {},
    },
    "./_playerStore.js": { listPlayers: async () => [{ id: "player" }] },
    "./_roundStore.js": { saveRound: async () => {} },
    "./_aiGeneratePrompt.js": {
      genPrompt: async () => {
        calls++;
        await pending;
        return { prompt: "cat" };
      },
    },
  }).default;
  const req = { method: "POST", body: { roomId: "ABCD" } };
  const first = response();
  const second = response();
  const running = handler(req, first);
  await new Promise((resolve) => setImmediate(resolve));
  await handler(req, second);
  assert.equal(second.code, 409);
  assert.equal(calls, 1);
  finish();
  await running;
  assert.equal(first.code, 200);
  assert.equal(locked, false);
});

test("waiting-room polls never take the lock needed to start a round", async () => {
  let locks = 0;
  const room = { id: "ABCD", status: "LOBBY", currentRoundId: null };
  const handler = load("api/get-room.ts", {
    "./_mutationLock.js": {
      acquireRoomMutation: async () => {
        locks++;
        return null;
      },
    },
    "./redis.js": { redis: {} },
    "./_roomStore.js": { getRoomById: async () => room },
    "./_roundStore.js": {},
    "./_submissionStore.js": {},
    "./_aiScoreRound.js": {},
    "./_roundScoreStore.js": {},
    "./shared.js": {},
  }).default;
  const responses = Array.from({ length: 10 }, response);
  await Promise.all(
    responses.map((res) =>
      handler({ method: "GET", query: { roomId: "ABCD" } }, res),
    ),
  );
  assert.equal(locks, 0);
  for (const res of responses) {
    assert.equal(res.code, 200);
    assert.equal(res.body.room.status, "LOBBY");
    assert.equal(res.body.round, null);
  }
});

test("round-start responses are sent only after the mutation lock is released", async () => {
  let releaseDone = false;
  const handler = load("api/start-round.ts", {
    "./_session.js": { authorize: async () => true },
    "./_limits.js": { allowRequest: async () => true },
    "./_mutationLock.js": {
      acquireRoomMutation: async () => async () => {
        await Promise.resolve();
        releaseDone = true;
      },
    },
    "./_roomStore.js": {
      getRoomById: async () => ({
        id: "ABCD",
        status: "LOBBY",
        drawingDurationMs: 180000,
        promptHistory: [],
      }),
      saveRoom: async () => {},
    },
    "./_playerStore.js": { listPlayers: async () => [{ id: "p" }] },
    "./_roundStore.js": { saveRound: async () => {} },
    "./_aiGeneratePrompt.js": { genPrompt: async () => ({ prompt: "cat" }) },
  }).default;
  const res = response();
  const send = res.json;
  res.json = function (body) {
    assert.equal(releaseDone, true);
    return send.call(this, body);
  };
  await handler({ method: "POST", body: { roomId: "ABCD" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.headersSent, true);
});
test("one submitted player advances to scoring before the deadline and unlocks before responding", async () => {
  let released = false;
  let room = { id: "ABCD", status: "DRAWING", currentRoundId: "r" };
  let round = {
    id: "r",
    roomId: "ABCD",
    status: "DRAWING",
    frozenPlayerIds: ["p"],
    roundEndAt: new Date(Date.now() + 120000).toISOString(),
  };
  const handler = load("api/get-room.ts", {
    "./_mutationLock.js": {
      acquireRoomMutation: async () => async () => {
        released = true;
      },
    },
    "./redis.js": { redis: { get: async () => "submission-id" } },
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
    "./_submissionStore.js": { submissionUniqKey: () => "key" },
    "./_aiScoreRound.js": {},
    "./_roundScoreStore.js": {},
    "./shared.js": { GRACE_MS: 30000 },
  }).default;
  const res = response();
  const send = res.json;
  res.json = function (body) {
    assert.equal(released, true);
    return send.call(this, body);
  };
  await handler({ method: "GET", query: { roomId: "ABCD" } }, res);
  assert.equal(res.body.round.status, "SCORING");
  assert.equal(res.body.room.status, "SCORING");
});

test("busy active-room polling preserves round details without mutating the room", async () => {
  const room = { id: "ABCD", status: "DRAWING", currentRoundId: "round1" };
  const round = {
    id: "round1",
    status: "DRAWING",
    prompt: "cat",
    frozenPlayerIds: ["p"],
  };
  const handler = load("api/get-room.ts", {
    "./_mutationLock.js": { acquireRoomMutation: async () => null },
    "./redis.js": { redis: {} },
    "./_roomStore.js": { getRoomById: async () => room },
    "./_roundStore.js": { getRound: async () => round },
    "./_submissionStore.js": {},
    "./_aiScoreRound.js": {},
    "./_roundScoreStore.js": {},
    "./shared.js": {},
  }).default;
  const res = response();
  await handler({ method: "GET", query: { roomId: "ABCD" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.round.id, "round1");
  assert.equal(res.body.round.prompt, "cat");
  assert.equal(res.body.room.status, "DRAWING");
});
