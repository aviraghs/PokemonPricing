'use client';

import { useEffect, useState } from 'react';
import styles from './CyberGrid.module.css';

export default function CyberGrid() {
  const [particles, setParticles] = useState<Array<{ top: string; left: string; size: string; duration: string }>>([]);

  useEffect(() => {
    // Generate random particles only on client side to avoid hydration mismatch
    const newParticles = Array.from({ length: 20 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1}px`,
      duration: `${Math.random() * 10 + 10}s`,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className={styles.gridContainer}>
      <div className={styles.grid}></div>
      <div className={styles.gridOverlay}></div>
      <div className={styles.particles}>
        {particles.map((p, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: `-${Math.random() * 5}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}
