import { useSyncExternalStore } from "react";
import { initializeTheme } from "../../lib/theme";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const store = initializeTheme();
  const theme = useSyncExternalStore(
    store.subscribe,
    store.getResolvedSnapshot,
  );
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={styles.toggle}
      onClick={() => store.setPreference(dark ? "light" : "dark")}
    >
      <span className={styles.thumb} aria-hidden="true" />
      <svg
        className={styles.sun}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
      </svg>
      <svg
        className={styles.moon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
      </svg>
    </button>
  );
}
