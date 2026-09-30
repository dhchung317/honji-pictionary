import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <main className="state-page">
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>

      <Link to="/">Back to home</Link>
    </main>
  );
}

export default NotFoundPage;
