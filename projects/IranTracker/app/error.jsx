'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('[SIGINT-MAP] Route error:', error);
  }, [error]);

  return (
    <main className="sigint-route-error">
      <div className="sigint-route-error__card">
        <h1>SIGINT-MAP failed to load</h1>
        <p>{error?.message || 'Unknown route error.'}</p>
        <button type="button" onClick={reset}>
          Retry
        </button>
      </div>
    </main>
  );
}
