'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SellRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to marketplace
    router.replace('/marketplace');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'var(--font-inter)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Redirecting to Marketplace...</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          The sell page has moved to the marketplace
        </p>
      </div>
    </div>
  );
}
