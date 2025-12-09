// src/hooks/useCountdown.ts
import { useEffect, useState } from "react";

interface CountdownState {
  secondsLeft: number | null;
  isExpired: boolean;
}

export function useCountdown(endTimeIso: string | null): CountdownState {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!endTimeIso) {
      setSecondsLeft(null);
      return;
    }

    const end = Date.parse(endTimeIso);
    if (Number.isNaN(end)) {
      setSecondsLeft(null);
      return;
    }

    const update = () => {
      const now = Date.now();
      const diffMs = end - now;
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setSecondsLeft(secs);
    };

    update();
    const interval = setInterval(update, 500);

    return () => clearInterval(interval);
  }, [endTimeIso]);

  const isExpired = secondsLeft === 0 && secondsLeft !== null;

  return { secondsLeft, isExpired };
}