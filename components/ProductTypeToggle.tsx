'use client';

import { useState, useEffect } from 'react';
import styles from './ProductTypeToggle.module.css';

interface ProductTypeToggleProps {
  onChange?: (type: 'cards' | 'sealed') => void;
}

export default function ProductTypeToggle({ onChange }: ProductTypeToggleProps) {
  const [productType, setProductType] = useState<'cards' | 'sealed'>('cards');

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('productType') as 'cards' | 'sealed' | null;
    if (saved) {
      setProductType(saved);
      onChange?.(saved);
    }
  }, []);

  const handleToggle = (type: 'cards' | 'sealed') => {
    setProductType(type);
    localStorage.setItem('productType', type);
    onChange?.(type);

    // Dispatch event for other components to listen
    window.dispatchEvent(new CustomEvent('productTypeChanged', { detail: type }));
  };

  return (
    <div className={styles.toggleContainer}>
      <button
        className={`${styles.toggleButton} ${productType === 'cards' ? styles.active : ''}`}
        onClick={() => handleToggle('cards')}
      >
        <span className={styles.icon}>🎴</span>
        <span className={styles.label}>Cards</span>
      </button>
      <button
        className={`${styles.toggleButton} ${productType === 'sealed' ? styles.active : ''}`}
        onClick={() => handleToggle('sealed')}
      >
        <span className={styles.icon}>📦</span>
        <span className={styles.label}>Sealed</span>
      </button>
      <div
        className={styles.slider}
        style={{
          transform: productType === 'sealed' ? 'translateX(100%)' : 'translateX(0)'
        }}
      />
    </div>
  );
}
