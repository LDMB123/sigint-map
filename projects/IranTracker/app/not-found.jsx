export default function NotFound() {
  return (
    <main className="sigint-route-error">
      <div className="sigint-route-error__card">
        <h1>404</h1>
        <p>Page not found.</p>
        <a href="/" className="sigint-route-error__link">
          Return to Dashboard
        </a>
      </div>
    </main>
  );
}
