const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const moduleExports = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(path.resolve(__dirname, "../../src/lib/theme.ts"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  { module: moduleExports, exports: moduleExports.exports },
);
const { createThemeStore, THEME_STORAGE_KEY } = moduleExports.exports;

function fixture({ saved = null, dark = false, blocked = false } = {}) {
  const systemListeners = new Set();
  const storageListeners = new Set();
  const values = new Map([[THEME_STORAGE_KEY, saved]]);
  const media = {
    matches: dark,
    addEventListener: (_type, listener) => systemListeners.add(listener),
    removeEventListener: (_type, listener) => systemListeners.delete(listener),
  };
  const browser = {
    document: { documentElement: { dataset: {} } },
    localStorage: {
      getItem(key) {
        if (blocked) throw new Error("Blocked");
        return values.get(key);
      },
      setItem(key, value) {
        if (blocked) throw new Error("Blocked");
        values.set(key, value);
      },
    },
    matchMedia: () => media,
    addEventListener: (_type, listener) => storageListeners.add(listener),
    removeEventListener: (_type, listener) => storageListeners.delete(listener),
  };
  const store = createThemeStore(browser);
  return {
    store,
    values,
    browser,
    theme: () => browser.document.documentElement.dataset.theme,
    system(dark) {
      media.matches = dark;
      systemListeners.forEach((listener) => listener());
    },
    storage(value, key = THEME_STORAGE_KEY) {
      storageListeners.forEach((listener) =>
        listener({ key, newValue: value, storageArea: browser.localStorage }),
      );
    },
    listenerCount: () => systemListeners.size + storageListeners.size,
  };
}

test("system preference follows OS changes while explicit choices win", () => {
  const f = fixture({ dark: true });
  assert.equal(f.store.getSnapshot(), "system");
  assert.equal(f.theme(), "dark");
  f.system(false);
  assert.equal(f.theme(), "light");
  f.store.setPreference("dark");
  f.system(false);
  assert.equal(f.theme(), "dark");
  assert.equal(f.values.get(THEME_STORAGE_KEY), "dark");
  f.store.setPreference("system");
  assert.equal(f.theme(), "light");
});

test("saved selection is applied immediately and survives a new page load", () => {
  const f = fixture({ saved: "light", dark: true });
  assert.equal(f.theme(), "light");
  f.store.setPreference("dark");
  const reloaded = fixture({ saved: f.values.get(THEME_STORAGE_KEY) });
  assert.equal(reloaded.theme(), "dark");
});

test("cross-tab choices synchronize and clearing storage restores system", () => {
  const f = fixture({ saved: "light", dark: true });
  let notifications = 0;
  const unsubscribe = f.store.subscribe(() => notifications++);
  f.storage("dark", "unrelated");
  assert.equal(f.theme(), "light");
  f.storage("dark");
  assert.equal(f.store.getSnapshot(), "dark");
  assert.equal(f.theme(), "dark");
  f.storage(null, null);
  assert.equal(f.store.getSnapshot(), "system");
  assert.equal(f.theme(), "dark");
  assert.equal(notifications, 2);
  unsubscribe();
  f.store.dispose();
  assert.equal(f.listenerCount(), 0);
});

test("invalid stored preferences and blocked storage still allow switching", () => {
  assert.equal(fixture({ saved: "unexpected", dark: true }).theme(), "dark");
  const f = fixture({ blocked: true });
  f.store.setPreference("dark");
  assert.equal(f.theme(), "dark");
  f.store.setPreference("invalid");
  assert.equal(f.theme(), "dark");
});

test("toggle subscribers track resolved system theme and explicit overrides", () => {
  const f = fixture();
  const seen = [];
  f.store.subscribe(() => seen.push(f.store.getResolvedSnapshot()));
  f.system(true);
  assert.equal(f.store.getResolvedSnapshot(), "dark");
  f.store.setPreference("light");
  f.system(true);
  assert.deepEqual(seen, ["dark", "light"]);
  assert.equal(f.store.getResolvedSnapshot(), "light");
});
