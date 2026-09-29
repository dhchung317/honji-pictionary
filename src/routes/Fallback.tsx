import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        position: 'absolute',
        top: '40%'
      }}
    >
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>

      <Link to="/">Back to home</Link>
    </main>
  );
}

export default NotFoundPage;
