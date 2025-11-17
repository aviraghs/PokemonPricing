'use client';

import { useState, useEffect } from 'react';
import { useToast } from './ToastProvider';
import styles from './CompareButton.module.css';

interface CompareButtonProps {
  cardData: {
    id: string;
    name: string;
    image?: string;
    set?: { name: string; id: string };
    rarity?: string;
    types?: string[];
    localId?: string;
    hp?: string;
    pricing?: any;
  };
}

export default function CompareButton({ cardData }: CompareButtonProps) {
  const { showToast } = useToast();
  const [isInCompare, setIsInCompare] = useState(false);
  const [compareCount, setCompareCount] = useState(0);

  useEffect(() => {
    checkIfInCompare();
  }, [cardData.id]);

  const checkIfInCompare = () => {
    try {
      const stored = localStorage.getItem('compareCards');
      if (stored) {
        const cards = JSON.parse(stored);
        setCompareCount(cards.length);
        setIsInCompare(cards.some((card: any) => card.id === cardData.id));
      }
    } catch (error) {
      console.error('Failed to check compare status:', error);
    }
  };

  const toggleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const stored = localStorage.getItem('compareCards');
      let cards = stored ? JSON.parse(stored) : [];

      if (isInCompare) {
        // Remove from compare
        cards = cards.filter((card: any) => card.id !== cardData.id);
        localStorage.setItem('compareCards', JSON.stringify(cards));
        setIsInCompare(false);
        setCompareCount(cards.length);
        showToast(`${cardData.name} removed from comparison`, 'success');
      } else {
        // Check limit
        if (cards.length >= 4) {
          showToast('Maximum 4 cards can be compared at once', 'error');
          return;
        }

        // Add to compare
        cards.push(cardData);
        localStorage.setItem('compareCards', JSON.stringify(cards));
        setIsInCompare(true);
        setCompareCount(cards.length);
        showToast(`${cardData.name} added to comparison (${cards.length}/4)`, 'success');
      }

      // Dispatch custom event for header badge update
      window.dispatchEvent(new Event('compareUpdated'));
    } catch (error) {
      console.error('Failed to toggle compare:', error);
      showToast('Failed to update comparison', 'error');
    }
  };

  return (
    <button
      onClick={toggleCompare}
      className={`${styles.compareBtn} ${isInCompare ? styles.active : ''}`}
      title={isInCompare ? 'Remove from comparison' : 'Add to comparison'}
    >
      {isInCompare ? '✓ In Comparison' : '⚖️ Compare'}
    </button>
  );
}
