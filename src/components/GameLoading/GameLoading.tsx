import styles from "./GameLoading.module.css";

interface GameLoadingProps {
  message?: string;
  inline?: boolean;
}

export function GameLoading({ message = "Loading...", inline = false }: GameLoadingProps) {
  return (
    <div className={`${styles.page} ${inline ? styles.inline : ""}`} role="status">
      <div className={styles.content}>
        <div className={styles.spinner} />
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
