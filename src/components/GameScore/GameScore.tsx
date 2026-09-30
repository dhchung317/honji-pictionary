import type { CSSProperties } from "react";
import "./GameScore.css";

type GameScoreProps = {
  score: number;
  rank?: number;
  height?: number;
};

export function GameScore({ score, rank, height = 32 }: GameScoreProps) {
  const medal = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null;
  const scoreColor = score >= 75 ? "gold" : score >= 50 ? "silver" : "bronze";
  const characters = score.toLocaleString("en-US").split("");
  const label = `${medal ? `${medal} medal, ` : ""}${rank ? `rank ${rank}, ` : ""}score ${score}`;
  return (
    <span
      className={`game-score game-score--${medal ?? "burst"}`}
      style={{ "--score-digit-height": `${height}px`, "--score-badge-size": `${height * 3.5}px` } as CSSProperties}
      role="img"
      aria-label={label}
    >
      <svg className="game-score__art" viewBox={medal ? "0 0 100 124" : "0 0 100 100"} aria-hidden="true">
        {medal ? <>
          <path className="game-score__ribbon" d="M23 68 L8 115 L29 106 L40 121 L52 78 Z" />
          <path className="game-score__ribbon" d="M77 68 L92 115 L71 106 L60 121 L48 78 Z" />
          <circle className="game-score__face" cx="50" cy="45" r="40" />
          <circle className="game-score__ring" cx="50" cy="45" r="32" />
          <path className="game-score__shine" d="M22 35 Q28 17 47 17" />
        </> : <>
          <path className="game-score__face" d="M50 3 L59 13 L72 8 L76 22 L90 22 L88 36 L98 45 L88 55 L92 69 L78 73 L75 87 L61 85 L50 97 L40 87 L26 92 L22 78 L8 76 L12 61 L2 51 L13 41 L8 27 L22 23 L25 9 L40 13 Z" />
          <circle className="game-score__ring" cx="50" cy="50" r="31" />
        </>}
      </svg>
      <span className={`game-score__number game-score__number--${scoreColor}`} aria-hidden="true">
        {characters.map((char, index) => (
          <img key={index} src={`/score-font/${char === "," ? "comma" : char}.png`} alt="" />
        ))}
      </span>
    </span>
  );
}
