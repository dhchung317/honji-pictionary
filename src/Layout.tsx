import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="app-root">
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
