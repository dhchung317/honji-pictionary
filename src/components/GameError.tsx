type Props = {
  type: string;
};

export function GameErrorPage({ type }: Props) {
  let title = "Couldn't load game";
  let message =
    "Something went wrong while loading the game. Please try again.";

  if (type === "ROOM_NOT_FOUND") {
    title = "Game not found";
    message = "This game may have expired or the room code may be incorrect.";
  }

  if (type === "MISSING_ROOM_ID") {
    title = "Missing room";
    message = "No room code was provided.";
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        position: "absolute",
        top: "40%",
      }}
    >
      <h1>{title}</h1>
      <p>{message}</p>
      <a href="/">Return home</a>
    </main>
  );
}
