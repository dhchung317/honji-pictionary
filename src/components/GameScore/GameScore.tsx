import "./GameScore.css";

type ScoreColor = "gold" | "silver" | "bronze";

type GameScoreProps = {
  score: number;
  height?: number;
  // color?: ScoreColor;
};

function getScoreColor(score: number): ScoreColor {
  if (score >= 75) return "gold";

  if (score >= 50) return "silver";

  return "bronze";
}

export function GameScore({ score, height = 48 }: GameScoreProps) {
  const color = getScoreColor(score);
  const characters = score.toLocaleString().split("");

  return (
    <span className={`game-score game-score--${color}`}>
      {characters.map((char, index) => {
        const image = char === "," ? "comma" : char;

        return (
          <img
            key={index}
            src={`/score-font/${image}.png`}
            alt=""
            style={{ height }}
          />
        );
      })}
    </span>
  );
}
