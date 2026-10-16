export type ThemePreference = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "honji:theme";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/** Owns persistence and document styling; changing theme never remounts the game. */
export function createThemeStore(browser: Window) {
  const media = browser.matchMedia("(prefers-color-scheme: dark)");
  const listeners = new Set<() => void>();
  let preference: ThemePreference = "system";
  try {
    const saved = browser.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(saved)) preference = saved;
  } catch {
    // Theme switching still works when storage is unavailable.
  }

  function getResolvedSnapshot(): "light" | "dark" {
    return preference === "system"
      ? media.matches
        ? "dark"
        : "light"
      : preference;
  }

  function apply() {
    browser.document.documentElement.dataset.theme = getResolvedSnapshot();
  }

  function notify() {
    apply();
    listeners.forEach((listener) => listener());
  }

  function onSystemChange() {
    if (preference === "system") notify();
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    if (event.storageArea !== browser.localStorage) return;
    preference = isThemePreference(event.newValue) ? event.newValue : "system";
    notify();
  }

  media.addEventListener("change", onSystemChange);
  browser.addEventListener("storage", onStorage);
  apply();

  return {
    getSnapshot: () => preference,
    getResolvedSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setPreference(value: ThemePreference) {
      if (!isThemePreference(value)) return;
      preference = value;
      try {
        browser.localStorage.setItem(THEME_STORAGE_KEY, value);
      } catch {
        // The current tab can still retain its choice in memory.
      }
      notify();
    },
    dispose() {
      media.removeEventListener("change", onSystemChange);
      browser.removeEventListener("storage", onStorage);
      listeners.clear();
    },
  };
}

let store: ReturnType<typeof createThemeStore> | undefined;

export function initializeTheme() {
  return (store ??= createThemeStore(window));
}
