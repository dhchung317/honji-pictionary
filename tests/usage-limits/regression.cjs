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
          : require(id),
    crypto: crypto.webcrypto,
    Date,
    Error,
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
test("untrusted image locations and other players' images are rejected", () => {
  const { validImageUrl } = load("api/_limits.ts", {
    "./redis.js": { redis: {} },
  });
  const prefix = "room/ABCD/round/round/players/player-";
  assert.equal(
    validImageUrl(
      "https://store.public.blob.vercel-storage.com/" + prefix + "random.png",
      prefix,
    ),
    true,
  );
  for (const value of [
    "http://store.public.blob.vercel-storage.com/" + prefix + "r.png",
    "https://evil.example/" + prefix + "r.png",
    "https://store.public.blob.vercel-storage.com/room/ABCD/round/round/players/other-r.png",
    "https://store.public.blob.vercel-storage.com/" + prefix + "r.png?x=1",
  ])
    assert.equal(validImageUrl(value, prefix), false);
});
test("limits reject over-budget requests and fail closed if Redis is unavailable", async () => {
  let count = 0;
  const { allowRequest } = load("api/_limits.ts", {
    "./redis.js": { redis: { eval: async () => ++count } },
  });
  const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
  assert.equal(await allowRequest(req, response(), "test", 1, 60), true);
  const limited = response();
  assert.equal(await allowRequest(req, limited, "test", 1, 60), false);
  assert.equal(limited.code, 429);
  const failed = load("api/_limits.ts", {
    "./redis.js": {
      redis: {
        eval: async () => {
          throw Error("offline");
        },
      },
    },
  });
  const unavailable = response();
  assert.equal(
    await failed.allowRequest(req, unavailable, "test", 1, 60),
    false,
  );
  assert.equal(unavailable.code, 503);
});

test("join permits 15 characters, rejects 16, and displays room-full API errors", async () => {
  let full = false;
  const handler = load("api/join-room.ts", {
    "./_mutationLock.js": { acquireRoomMutation: async () => async () => {} },
    "./_deferredResponse.js": { deferJsonResponse: () => () => {} },
    "./_session.js": { issueSession: async () => "token" },
    "./_limits.js": { allowRequest: async () => true },
    "./_roomStore.js": {
      getRoomById: async () => ({ id: "ABCD", status: "LOBBY" }),
    },
    "./_playerStore.js": {
      upsertPlayer: async () => {
        if (full) throw Error("ROOM_FULL");
        return { id: "p" };
      },
    },
  }).default;
  const req = (name) => ({ method: "POST", body: { roomId: "ABCD", name } });
  const okay = response();
  await handler(req("a".repeat(15)), okay);
  assert.equal(okay.code, 200);
  const tooLong = response();
  await handler(req("a".repeat(16)), tooLong);
  assert.equal(tooLong.code, 400);
  assert.match(tooLong.body.error, /15 characters/);
  full = true;
  const filled = response();
  await handler(req("Pat"), filled);
  assert.equal(filled.code, 409);
  assert.match(filled.body.error, /10 players/);
});
