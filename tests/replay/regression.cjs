const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const crypto = require("node:crypto");
function load(file, mocks = {}) {
  const code = ts.transpileModule(
    readFileSync(path.resolve(__dirname, "../..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) =>
      id in mocks
        ? mocks[id]
        : id === "./_lobbyReady.js"
          ? load("api/_lobbyReady.ts", mocks)
          : id === "./_deferredResponse.js"
            ? load("api/_deferredResponse.ts")
            : require(id),
    crypto: crypto.webcrypto,
    Date,
    console,
  });
  return module.exports;
}
function response() {
  return {
    code: 200,
    status(n) {
      this.code = n;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
function fixture() {
  let room = {
    id: "ABCD",
    hostId: "host",
    status: "DONE",
    currentRoundId: "round-1",
  };
  const players = new Map(
    ["a", "b"].map((id) => [id, { id, roomId: "ABCD", name: id }]),
  );
  const roster = new Set(players.keys());
  let locked = false,
    allowed = true;
  const mocks = {
    "./_session.js": {
      authorize: async (_req, res) => {
        if (!allowed) res.status(403).json({});
        return allowed;
      },
    },
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
      getRoomById: async () => room,
      saveRoom: async (value) => {
        room = value;
      },
    },
    "./_roundStore.js": {
      getRound: async () => ({
        id: "round-1",
        status: "DONE",
        frozenPlayerIds: ["a", "b"],
      }),
    },
    "./_playerStore.js": {
      getPlayer: async (id) => players.get(id),
      listPlayers: async () => [...roster].map((id) => players.get(id)),
      savePlayer: async (player) => players.set(player.id, player),
      removePlayerFromRoster: async (_room, id) => roster.delete(id),
      rejoinPlayer: async (player) => {
        roster.add(player.id);
        players.set(player.id, player);
      },
      leavePlayer: async (player) => {
        roster.delete(player.id);
        players.delete(player.id);
      },
    },
  };
  const call = async (file, body) => {
    const res = response();
    await load(file, mocks).default({ method: "POST", body, headers: {} }, res);
    return res;
  };
  return {
    call,
    players,
    roster,
    get room() {
      return room;
    },
    set room(value) {
      room = value;
    },
    deny() {
      allowed = false;
    },
    lock() {
      locked = true;
    },
  };
}
test("early replay survives host reset; other players are removed; late replay restores the same identity", async () => {
  const f = fixture();
  const early = await f.call("api/replay-player.ts", {
    roomId: "ABCD",
    playerId: "a",
    roundId: "round-1",
  });
  assert.equal(early.body.waitingForHost, true);
  assert.equal(
    (await f.call("api/next-round.ts", { roomId: "ABCD" })).code,
    200,
  );
  assert.equal(f.room.status, "LOBBY");
  assert.equal(f.room.replayFromRoundId, "round-1");
  assert.deepEqual([...f.roster], ["a"]);
  const late = await f.call("api/replay-player.ts", {
    roomId: "ABCD",
    playerId: "b",
    roundId: "round-1",
  });
  assert.equal(late.body.waitingForHost, false);
  assert.deepEqual([...f.roster], ["a", "b"]);
  assert.equal(f.players.get("b").id, "b");
});
test("host reset and replay are idempotent", async () => {
  const f = fixture();
  for (let i = 0; i < 2; i++)
    await f.call("api/replay-player.ts", {
      roomId: "ABCD",
      playerId: "a",
      roundId: "round-1",
    });
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await f.call("api/next-round.ts", { roomId: "ABCD" })).code,
      200,
    );
  assert.deepEqual([...f.roster], ["a"]);
});
test("replay rejects an active next round, stale round, closed room and unrecognized participant", async () => {
  for (const change of [
    (f) => {
      f.room = { ...f.room, status: "DRAWING", currentRoundId: "round-2" };
    },
    (f) => {
      f.room = { ...f.room, currentRoundId: "round-2" };
    },
    (f) => {
      f.room = { ...f.room, closed: true };
    },
    (f) => f.players.delete("a"),
  ]) {
    const f = fixture();
    change(f);
    const res = await f.call("api/replay-player.ts", {
      roomId: "ABCD",
      playerId: "a",
      roundId: "round-1",
    });
    assert.ok(res.code >= 400);
    assert.equal(f.players.get("a")?.replayRoundId, undefined);
  }
});
test("unauthorized and concurrent replay cannot mutate the roster", async () => {
  for (const mode of ["deny", "lock"]) {
    const f = fixture();
    f[mode]();
    const res = await f.call("api/replay-player.ts", {
      roomId: "ABCD",
      playerId: "a",
      roundId: "round-1",
    });
    assert.equal(res.code, mode === "deny" ? 403 : 409);
    assert.equal(f.players.get("a").replayRoundId, undefined);
  }
});
test("leaving removes replay intent and membership without affecting another player", async () => {
  const f = fixture();
  await f.call("api/replay-player.ts", {
    roomId: "ABCD",
    playerId: "a",
    roundId: "round-1",
  });
  assert.equal(
    (await f.call("api/leave-room.ts", { roomId: "ABCD", playerId: "a" })).code,
    200,
  );
  assert.equal(f.players.has("a"), false);
  assert.deepEqual([...f.roster], ["b"]);
});
