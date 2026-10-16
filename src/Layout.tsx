import { Outlet, useMatch } from "react-router-dom";
import { GameHeader } from "./components/GameHeader/GameHeader";

export function Layout() {
  const host = useMatch("/host/:roomId/*");
  const player = useMatch("/room/:roomId/*");
  return (
    <div className="app-root" data-room={Boolean(host || player)}>
      <GameHeader />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}
