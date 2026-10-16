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
test("sessions reject missing, forged, other-role and other-room credentials", async () => {
  const records = new Map();
  const redis = {
    set: async (k, v) => records.set(k, v),
    get: async (k) => records.get(k) || null,
    expire: async () => {},
  };
  const { issueSession, authorize } = load("api/_session.ts", {
    "./redis.js": { redis, TTL_SECONDS: 3600 },
  });
  const expected = { role: "HOST", roomId: "ABCD", id: "host" };
  const token = await issueSession(expected);
  assert.equal(token.length, 64);
  assert.ok(![...records.keys()].some((k) => k.includes(token)));
  for (const [header, identity] of [
    [undefined, expected],
    ["Bearer " + "a".repeat(64), expected],
    ["Bearer " + token, { ...expected, roomId: "WXYZ" }],
    ["Bearer " + token, { ...expected, role: "PLAYER" }],
  ]) {
    const res = response();
    assert.equal(
      await authorize({ headers: { authorization: header } }, res, identity),
      false,
    );
    assert.equal(res.code, 403);
  }
  assert.equal(
    await authorize(
      { headers: { authorization: "Bearer " + token } },
      response(),
      expected,
    ),
    true,
  );
});
test("a room code alone cannot start a round or consume AI", async () => {
  let called = false;
  const handler = load("api/start-round.ts", {
    "./_mutationLock.js": { acquireRoomMutation: async () => async () => {} },
    "./_limits.js": { allowRequest: async () => true },
    "./_session.js": {
      authorize: async (_req, res) => {
        res.status(403).json({});
        return false;
      },
    },
    "./_roomStore.js": {
      getRoomById: async () => ({
        id: "ABCD",
        hostId: "host",
        status: "SCORING_FAILED",
        currentRoundId: "round",
      }),
    },
    "./_playerStore.js": {},
    "./_roundStore.js": {},
    "./_aiGeneratePrompt.js": {
      genPrompt: async () => {
        called = true;
      },
    },
  }).default;
  const res = response();
  await handler({ method: "POST", body: { roomId: "ABCD" }, headers: {} }, res);
  assert.equal(res.code, 403);
  assert.equal(called, false);
});
