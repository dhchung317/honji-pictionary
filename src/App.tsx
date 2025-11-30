import { Route, Routes } from "react-router-dom";
import Home from "./routes/Home";
import HostNewGame from "./routes/HostNewGame";
import HostRoom from "./routes/HostRoom";
import JoinRoom from "./routes/JoinRoom";
import Results from "./routes/Results";
import Join from "./routes/Join";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host/new" element={<HostNewGame />} />
      <Route path="/host/:roomId" element={<HostRoom />} />
      <Route path="/join" element={<Join/>} />
      <Route path="/join/:roomId" element={<JoinRoom />} />
      <Route path="/room/:roomId/results" element={<Results />} />
    </Routes>
  );
}

export default App;
