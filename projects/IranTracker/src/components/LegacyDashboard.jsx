'use client';

import { useEffect, useState } from 'react';
import { bootstrapLegacyApp } from '../legacy/init.js';

export default function LegacyDashboard({ markup }) {
  const [bootError, setBootError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    (async () => {
      try {
        const resolvedCleanup = await bootstrapLegacyApp();

        if (!mounted) {
          resolvedCleanup?.();
          return;
        }

        cleanup = resolvedCleanup || (() => {});
      } catch (error) {
        if (mounted) {
          setBootError(error instanceof Error ? error.message : 'Unknown bootstrap error');
        }
      }
    })();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  return (
    <>
      <div
        id="legacy-dashboard-root"
        style={{ height: '100%', width: '100%' }}
        dangerouslySetInnerHTML={{ __html: markup }}
        suppressHydrationWarning
      />
      {bootError ? (
        <div className="sigint-bootstrap-error" role="alert">
          <strong>Bootstrap error:</strong> {bootError}
        </div>
      ) : null}
    </>
  );
}
