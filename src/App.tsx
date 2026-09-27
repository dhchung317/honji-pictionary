import { Route, Routes } from "react-router-dom";
import Home from "./routes/Home";
import HostRoom from "./routes/HostRoom";
import JoinRoom from "./routes/JoinRoom";
import Results from "./routes/Results";
import Join from "./routes/Join";
import { Layout } from "./Layout";
import PlayerResults from "./routes/PlayerResults";
import NotFoundPage from "./routes/Fallback";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/host/:roomId" element={<HostRoom />} />
        <Route path="/join" element={<Join />} />
        <Route path="/join/:roomId" element={<JoinRoom />} />
        <Route path="/room/:roomId/results" element={<Results />} />
        <Route path="/room/:roomId/playerresults" element={<PlayerResults />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
