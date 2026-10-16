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
    require: (id) => (id in mocks ? mocks[id] : require(id)),
    crypto: crypto.webcrypto,
    Date,
    console: { ...console, error() {} },
    setTimeout,
    clearTimeout,
    URL,
    AbortSignal,
    Buffer,
    process,
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

const player = "11111111-1111-4111-8111-111111111111";
const round = "22222222-2222-4222-8222-222222222222";
const now = Date.now();
const blob = (room = "ABCD", age = 2 * 3600000) => ({
  pathname: `room/${room}/round/${round}/players/${player}-abc.png`,
  url: `https://store.public.blob.vercel-storage.com/room/${room}/round/${round}/players/${player}-abc.png`,
  uploadedAt: new Date(now - age),
});
test("cleanup selects only old game images belonging to absent rooms", async () => {
  const deleted = [];
  const objects = [
    blob(),
    blob("WXYZ"),
    blob("ABCD", 1000),
    { ...blob(), pathname: "assets/logo.png" },
    { ...blob(), pathname: "room/ABCD/unrelated.png" },
  ];
  const api = load("api/_blobCleanup.ts", {
    "@vercel/blob": {
      list: async () => ({ blobs: objects, hasMore: false }),
      del: async (urls) => deleted.push(...urls),
    },
    "./redis.js": {
      redis: {
        get: async () => null,
        mget: async () => [null, { id: "WXYZ" }],
        del: async () => {},
      },
    },
  });
  const result = await api.cleanupBlobs(false, now);
  assert.equal(result.deleted, 1);
  assert.equal(deleted[0], objects[0].url);
});
test("dry runs never delete and expired avatars are included", async () => {
  const avatar = {
    ...blob(),
    pathname: `room/ABCD/players/${player}/avatar-abc.png`,
  };
  const api = load("api/_blobCleanup.ts", {
    "@vercel/blob": {
      list: async () => ({ blobs: [avatar], hasMore: false }),
      del: async () => {
        throw Error("dry-run deleted");
      },
    },
    "./redis.js": {
      redis: {
        get: async () => null,
        mget: async () => [null],
        del: async () => {},
      },
    },
  });
  const result = await api.cleanupBlobs(true, now);
  assert.equal(result.eligible, 1);
  assert.equal(result.deleted, 0);
});
test("Redis outages stop deletion; failed deletes do not advance the cursor", async () => {
  let advanced = false;
  const redis = {
    get: async () => "previous",
    mget: async () => {
      throw Error("offline");
    },
    set: async () => {
      advanced = true;
    },
  };
  const store = {
    list: async () => ({ blobs: [blob()], hasMore: true, cursor: "next" }),
    del: async () => {
      throw Error("delete failed");
    },
  };
  const api = load("api/_blobCleanup.ts", {
    "@vercel/blob": store,
    "./redis.js": { redis },
  });
  await assert.rejects(api.cleanupBlobs(false, now), /offline/);
  assert.equal(advanced, false);
  redis.mget = async () => [null];
  await assert.rejects(api.cleanupBlobs(false, now), /delete failed/);
  assert.equal(advanced, false);
});
test("bounded cleanup resumes its cursor instead of rescanning only the first page", async () => {
  const cursors = [];
  let page = 0;
  let saved;
  const api = load("api/_blobCleanup.ts", {
    "@vercel/blob": {
      list: async (opts) => {
        cursors.push(opts.cursor);
        return { blobs: [], hasMore: true, cursor: `page-${++page}` };
      },
    },
    "./redis.js": {
      redis: {
        get: async () => "old",
        set: async (_key, value) => {
          saved = value;
        },
      },
    },
  });
  const result = await api.cleanupBlobs(true, now);
  assert.equal(cursors.length, 5);
  assert.equal(cursors[0], "old");
  assert.equal(saved, "page-5");
  assert.equal(result.hasMore, true);
});
test("unauthorized cleanup calls cannot access the Blob store", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-only-secret";
  try {
    const handler = load("api/cleanup-blobs.ts", {
      "./redis.js": { redis: {} },
      "./_blobCleanup.js": {
        cleanupBlobs: async () => {
          throw Error("must not run");
        },
      },
    }).default;
    const res = response();
    await handler({ method: "GET", headers: {}, query: {} }, res);
    assert.equal(res.code, 401);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("cleanup requires explicit enablement and preview deployments always dry-run", async () => {
  const saved = {
    CRON_SECRET: process.env.CRON_SECRET,
    BLOB_CLEANUP_ENABLED: process.env.BLOB_CLEANUP_ENABLED,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  let mode;
  const handler = load("api/cleanup-blobs.ts", {
    "./redis.js": { redis: { set: async () => "OK", eval: async () => 1 } },
    "./_blobCleanup.js": {
      cleanupBlobs: async (dryRun) => {
        mode = dryRun;
        return { dryRun };
      },
    },
  }).default;
  const req = {
    method: "GET",
    headers: { authorization: "Bearer test-only-secret" },
    query: {},
  };
  try {
    process.env.CRON_SECRET = "test-only-secret";
    delete process.env.BLOB_CLEANUP_ENABLED;
    delete process.env.VERCEL_ENV;
    await handler(req, response());
    assert.equal(mode, true);
    process.env.BLOB_CLEANUP_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    await handler(req, response());
    assert.equal(mode, true);
    process.env.VERCEL_ENV = "production";
    await handler({ ...req, query: { dryRun: "1" } }, response());
    assert.equal(mode, true);
    await handler(req, response());
    assert.equal(mode, false);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
