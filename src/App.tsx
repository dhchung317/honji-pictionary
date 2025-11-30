import { Route, Routes } from "react-router-dom";
import Home from "./routes/Home";
import HostNewGame from "./routes/HostNewGame";
import HostRoom from "./routes/HostRoom";
import JoinRoom from "./routes/JoinRoom";
import Results from "./routes/Results";
import Join from "./routes/Join";
import { Layout } from "./Layout";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/host/new" element={<HostNewGame />} />
        <Route path="/host/:roomId" element={<HostRoom />} />
        <Route path="/join" element={<Join />} />
        <Route path="/join/:roomId" element={<JoinRoom />} />
        <Route path="/room/:roomId/results" element={<Results />} />
      </Route>
    </Routes>
  );
}

export default App;
