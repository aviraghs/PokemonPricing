'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from './ToastProvider';
import styles from './QuickAddButton.module.css';

interface QuickAddButtonProps {
  cardData: {
    id: string; // TCGdex card ID format: setId-cardNumber (e.g., "base1-4")
    name: string;
    set: {
      id: string;
      name: string;
    };
  };
  language?: string;
  onSuccess?: () => void;
}

export default function QuickAddButton({
  cardData,
  language = 'en',
  onSuccess,
}: QuickAddButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInCollection, setIsInCollection] = useState(false);
  const [isCheckingCollection, setIsCheckingCollection] = useState(false);

  // Extract card number from TCGdex ID (e.g., "base1-4" -> "4")
  const localId = cardData.id.split('-')[1] || cardData.id;

  // Check if card is already in collection on mount
  useEffect(() => {
    if (user && cardData.id) {
      checkIfInCollection();
    } else {
      setIsCheckingCollection(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardData.id, language, user]);

  const checkIfInCollection = async () => {
    setIsCheckingCollection(true);
    try {
      const response = await fetch('/api/cards');
      if (response.ok) {
        const cards = await response.json();
        const cardExists = cards.some(
          (card: any) =>
            card.setId === cardData.set.id &&
            card.cardNumber === localId &&
            card.language === language
        );
        setIsInCollection(cardExists);
      }
    } catch (error) {
      console.error('Error checking collection:', error);
    } finally {
      setIsCheckingCollection(false);
    }
  };

  // Don't render if not logged in
  if (!user || authLoading) {
    return null;
  }

  const handleAddToCollection = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event from firing

    if (isInCollection) {
      showToast('This card is already in your collection', 'info');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: cardData.name,
          setId: cardData.set.id,
          cardNumber: localId,
          language: language,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsInCollection(true);
        showToast(`${cardData.name} added to collection!`, 'success');
        if (onSuccess) {
          onSuccess();
        }
      } else if (response.status === 409) {
        setIsInCollection(true);
        showToast('This card is already in your collection', 'info');
      } else {
        throw new Error(data.error || 'Failed to add card');
      }
    } catch (error) {
      console.error('Error adding card to collection:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to add card to collection',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`${styles.quickAddBtn} ${isInCollection ? styles.inCollection : ''} ${isLoading ? styles.loading : ''}`}
      onClick={handleAddToCollection}
      disabled={isLoading || isCheckingCollection}
      title={isInCollection ? 'Already in collection' : 'Add to collection'}
      aria-label={isInCollection ? 'Already in collection' : 'Add to collection'}
    >
      {isCheckingCollection ? (
        <span className={styles.spinner}></span>
      ) : isLoading ? (
        <span className={styles.spinner}></span>
      ) : isInCollection ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      )}
    </button>
  );
}
