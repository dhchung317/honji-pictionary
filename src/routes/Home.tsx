import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";
import "../App.css"
import { useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();

    const navigateToHostNewGame = () => {
        navigate('/host/new')
    }

  return (
    <>
      <div>
        <img src={viteLogo} className="logo" alt="Vite logo" />
        <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h1>Honji Pictionary</h1>
      <div className="card">
        <button onClick={navigateToHostNewGame}>
            Host New Game
        </button>
      </div>
    </>
  );
}

export default Home;