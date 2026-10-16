const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const crypto = require("node:crypto");
function fixture() {
  let now = 100000,
    allowed = true,
    locked = false,
    generated = 0;
  let room = {
    id: "ABCD",
    hostId: "host",
    status: "LOBBY",
    currentRoundId: null,
    lobbyVersion: 0,
    autoStartAt: null,
    drawingDurationMs: 180000,
    promptHistory: [],
  };
  let round = null;
  let generate = async () => ({ prompt: "A cat on a skateboard" });
  const players = new Map(
    ["a", "b"].map((id) => [
      id,
      { id, roomId: "ABCD", name: id, ready: false },
    ]),
  );
  const roster = new Set(players.keys());
  class Clock extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const mocks = {
    "./_session.js": {
      authorize: async (_req, res) => {
        if (!allowed) res.status(403).json({});
        return allowed;
      },
      issueSession: async () => "token",
    },
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
      getRoomById: async () => room,
      saveRoom: async (value) => {
        room = value;
      },
    },
    "./_roundStore.js": {
      getRound: async () => round,
      saveRound: async (value) => {
        round = value;
      },
    },
    "./_aiGeneratePrompt.js": {
      genPrompt: async () => {
        generated++;
        return generate();
      },
    },
    "./_playerStore.js": {
      listPlayers: async () => [...roster].map((id) => players.get(id)),
      getPlayer: async (id) => players.get(id),
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
      upsertPlayer: async (_room, name) => {
        const player = { id: name, roomId: "ABCD", name, ready: false };
        players.set(name, player);
        roster.add(name);
        return player;
      },
    },
  };
  function load(file) {
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
          : id === "./_deferredResponse.js"
            ? load("api/_deferredResponse.ts")
            : id === "./_lobbyReady.js"
              ? load("api/_lobbyReady.ts")
              : require(id),
      Date: Clock,
      crypto: crypto.webcrypto,
      console: { ...console, error() {} },
    });
    return module.exports;
  }
  const call = async (file, body) => {
    const res = {
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
    await load(file).default({ method: "POST", body, headers: {} }, res);
    return res;
  };
  const ready = (playerId, value = true, lobbyVersion = room.lobbyVersion) =>
    call("api/set-ready.ts", {
      roomId: "ABCD",
      playerId,
      ready: value,
      lobbyVersion,
    });
  return {
    players,
    roster,
    call,
    ready,
    sync: () => load("api/_lobbyReady.ts").syncLobbyCountdown(room),
    tick(ms) {
      now += ms;
    },
    get room() {
      return room;
    },
    set room(value) {
      room = value;
    },
    set round(value) {
      round = value;
    },
    get round() {
      return round;
    },
    get generated() {
      return generated;
    },
    setGenerate(fn) {
      generate = fn;
    },
    deny() {
      allowed = false;
    },
  };
}
test("five-second deadline begins only after every active player is ready and repeated readiness does not extend it", async () => {
  const f = fixture();
  await f.ready("a");
  assert.equal(f.room.autoStartAt, null);
  await f.ready("b");
  assert.equal(Date.parse(f.room.autoStartAt), 105000);
  f.tick(2000);
  await f.ready("b");
  assert.equal(Date.parse(f.room.autoStartAt), 105000);
});
test("unready cancels and becoming ready starts a fresh five seconds", async () => {
  const f = fixture();
  await f.ready("a");
  await f.ready("b");
  f.tick(2000);
  await f.ready("a", false);
  assert.equal(f.room.autoStartAt, null);
  await f.ready("a");
  assert.equal(Date.parse(f.room.autoStartAt), 107000);
});
test("new join cancels the countdown and must get ready before the next deadline", async () => {
  const f = fixture();
  await f.ready("a");
  await f.ready("b");
  assert.equal(
    (await f.call("api/join-room.ts", { roomId: "ABCD", name: "Pat" })).code,
    200,
  );
  assert.equal(f.room.autoStartAt, null);
  await f.ready("Pat");
  assert.equal(Date.parse(f.room.autoStartAt), 105000);
});
test("leaving an unready player schedules remaining ready players; empty rooms never count down", async () => {
  const f = fixture();
  await f.ready("a");
  await f.call("api/leave-room.ts", { roomId: "ABCD", playerId: "b" });
  assert.equal(Date.parse(f.room.autoStartAt), 105000);
  await f.call("api/leave-room.ts", { roomId: "ABCD", playerId: "a" });
  assert.equal(f.room.autoStartAt, null);
});
test("resetting for replay clears readiness and increments the lobby version", async () => {
  const f = fixture();
  await f.ready("a");
  await f.ready("b");
  f.room = { ...f.room, status: "DONE", currentRoundId: "old" };
  f.players.set("a", { ...f.players.get("a"), replayRoundId: "old" });
  await f.call("api/next-round.ts", { roomId: "ABCD" });
  assert.equal(f.room.lobbyVersion, 1);
  assert.equal(f.room.autoStartAt, null);
  assert.equal(f.players.get("a").ready, false);
  assert.deepEqual([...f.roster], ["a"]);
  assert.equal((await f.ready("a", true, 0)).code, 409);
});
test("late replay cancels an all-ready lobby countdown", async () => {
  const f = fixture();
  f.roster.delete("b");
  f.room = { ...f.room, replayFromRoundId: "old" };
  f.round = { id: "old", status: "DONE", frozenPlayerIds: ["a", "b"] };
  await f.ready("a");
  assert.ok(f.room.autoStartAt);
  await f.call("api/replay-player.ts", {
    roomId: "ABCD",
    playerId: "b",
    roundId: "old",
  });
  assert.equal(f.room.autoStartAt, null);
});
test("automatic start rejects early, cancelled and stale deadlines before spending AI calls", async () => {
  for (const kind of ["early", "unready", "stale"]) {
    const f = fixture();
    await f.ready("a");
    await f.ready("b");
    if (kind !== "early") f.tick(5000);
    if (kind === "unready") await f.ready("a", false);
    const res = await f.call("api/start-round.ts", {
      roomId: "ABCD",
      autoStart: true,
      lobbyVersion: kind === "stale" ? 2 : 0,
    });
    assert.equal(res.code, 409);
    assert.equal(f.generated, 0);
    assert.equal(f.room.status, "LOBBY");
  }
});
test("automatic start freezes the ready roster once after five seconds", async () => {
  const f = fixture();
  await f.ready("a");
  await f.ready("b");
  f.tick(5000);
  const req = { roomId: "ABCD", autoStart: true, lobbyVersion: 0 };
  assert.equal((await f.call("api/start-round.ts", req)).code, 200);
  assert.equal(f.room.status, "DRAWING");
  assert.equal(f.room.autoStartAt, null);
  assert.deepEqual(Array.from(f.round.frozenPlayerIds), ["a", "b"]);
  assert.equal((await f.call("api/start-round.ts", req)).code, 400);
  assert.equal(f.generated, 1);
});
test("readiness rejects non-members, unauthorized callers, invalid values and active rounds", async () => {
  const f = fixture();
  assert.equal((await f.ready("outsider")).code, 403);
  assert.equal((await f.ready("a", "true")).code, 400);
  f.room = { ...f.room, status: "DRAWING" };
  assert.equal((await f.ready("a")).code, 409);
  f.room = { ...f.room, status: "LOBBY" };
  f.deny();
  assert.equal((await f.ready("a")).code, 403);
  assert.equal(f.players.get("a").ready, false);
});
test("host can still manually start with unready players but never an empty roster", async () => {
  const f = fixture();
  assert.equal(
    (await f.call("api/start-round.ts", { roomId: "ABCD" })).code,
    200,
  );
  const empty = fixture();
  empty.roster.clear();
  assert.equal(
    (await empty.call("api/start-round.ts", { roomId: "ABCD" })).code,
    409,
  );
  assert.equal(empty.generated, 0);
});

test("start commitment is visible during generation and rejects last-second unready", async () => {
  const f = fixture();
  await f.ready("a");
  await f.ready("b");
  f.tick(5000);
  let finish, entered;
  const generating = new Promise((resolve) => {
    entered = resolve;
  });
  f.setGenerate(() => {
    entered();
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const start = f.call("api/start-round.ts", {
    roomId: "ABCD",
    autoStart: true,
    lobbyVersion: 0,
  });
  await generating;
  assert.equal(f.room.status, "STARTING");
  assert.equal(f.round, null);
  const unready = await f.ready("a", false);
  assert.equal(unready.code, 409);
  assert.equal(unready.body.code, "ROUND_STARTING");
  assert.equal(f.players.get("a").ready, true);
  finish({ prompt: "cat" });
  assert.equal((await start).code, 200);
  assert.equal(f.room.status, "DRAWING");
});
test("generation failure reopens a fresh lobby with no automatic retry loop", async () => {
  const f = fixture();
  await f.ready("a");
  await f.ready("b");
  f.tick(5000);
  f.setGenerate(async () => {
    throw new Error("AI unavailable");
  });
  assert.equal(
    (await f.call("api/start-round.ts", { roomId: "ABCD" })).code,
    500,
  );
  assert.equal(f.room.status, "LOBBY");
  assert.equal(f.room.lobbyVersion, 1);
  assert.equal(f.room.autoStartAt, null);
  assert.equal(f.players.get("a").ready, false);
  assert.equal(f.round, null);
  assert.equal((await f.ready("a", true, 0)).code, 409);
});
