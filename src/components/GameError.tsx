type Props = {
  type: string;
};

export function GameErrorPage({ type }: Props) {
  const roomMissing = type === "ROOM_NOT_FOUND";

  return (
    <main style={{display: 'flex', flexDirection:'column', justifyContent: 'center', alignItems: 'center', width: '100%'}}>
      <h1>
        {roomMissing
          ? "Game not found"
          : "Couldn't load game"}
      </h1>

      <p>
        {roomMissing
          ? "This game may have expired or the room code may be incorrect."
          : "Something went wrong while loading the game. Please try again."}
      </p>

      <a href="/">Return home</a>
    </main>
  );
}