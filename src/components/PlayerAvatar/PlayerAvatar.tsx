import { Player } from "../../../shared/player";

import styles from "./PlayerAvatar.module.css";

interface PlayerAvatarProps {
  player: Player;
}

export function PlayerAvatar({ player }: PlayerAvatarProps) {
  return (
    <div className={styles.avatar}>
      {player.avatarUrl ? (
        <img
          className={styles.image}
          src={player.avatarUrl}
          alt={`${player.name}'s avatar`}
        />
      ) : (
        <span className={styles.fallback}>
          {player.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
