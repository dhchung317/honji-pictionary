import styles from "./GameLoading.module.css";

interface GameLoadingProps {
  message?: string;
}

export function GameLoading({ message = "Loading..." }: GameLoadingProps) {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.spinner} />
        <p className={styles.message}>{message}</p>
      </div>
    </main>
  );
}
