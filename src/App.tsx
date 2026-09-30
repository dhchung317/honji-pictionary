import { Route, Routes } from "react-router-dom";
import Home from "./routes/Home";
import HostRoom from "./routes/HostRoom";
import JoinRoom from "./routes/JoinRoom";
import Results from "./routes/Results";
import { Layout } from "./Layout";
import PlayerResults from "./routes/PlayerResults";
import NotFoundPage from "./routes/Fallback";
import PlayerLobby from "./routes/PlayerLobby";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/host/:roomId" element={<HostRoom />} />
        <Route path="/room/:roomId" element={<JoinRoom />} />
        <Route path="/room/:roomId/results" element={<Results />} />
        <Route path="/room/:roomId/playerresults" element={<PlayerResults />} />
        <Route path="/room/:roomId/lobby" element={<PlayerLobby />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
