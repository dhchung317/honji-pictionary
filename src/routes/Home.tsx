import { useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();

    const navigateToHostNewGame = () => {
        navigate('/host/new')
    }

  return (
    <div className="card">
      <h1>Honji Pictionary</h1>
      <div>
        <button onClick={navigateToHostNewGame}>
            Host New Game
        </button>
      </div>
    </div>
  );
}

export default Home;