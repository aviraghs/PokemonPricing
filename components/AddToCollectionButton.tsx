'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import styles from './AddToCollectionButton.module.css';

interface AddToCollectionButtonProps {
  cardData: {
    id: string; // TCGdex card ID format: setId-cardNumber (e.g., "base1-4")
    name: string;
    set: {
      id: string;
      name: string;
    };
    localId: string; // Card number
  };
  language?: string;
  onSuccess?: () => void;
}

export default function AddToCollectionButton({
  cardData,
  language = 'en',
  onSuccess,
}: AddToCollectionButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInCollection, setIsInCollection] = useState(false);
  const [isCheckingCollection, setIsCheckingCollection] = useState(true);

  // Check if card is already in collection on mount
  useEffect(() => {
    checkIfInCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardData.id, language]);

  const checkIfInCollection = async () => {
    try {
      const authResponse = await fetch('/api/auth/verify');
      if (!authResponse.ok) {
        // User not logged in
        setIsCheckingCollection(false);
        return;
      }

      // Get user's collection
      const response = await fetch('/api/cards');
      if (response.ok) {
        const cards = await response.json();
        const cardExists = cards.some(
          (card: any) =>
            card.setId === cardData.set.id &&
            card.cardNumber === cardData.localId &&
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

  const handleAddToCollection = async () => {
    setIsLoading(true);

    try {
      // Check if user is authenticated
      const authResponse = await fetch('/api/auth/verify');
      if (!authResponse.ok) {
        // User not logged in - show message
        showToast('Please login to add cards to your collection', 'info');
        setIsLoading(false);
        return;
      }

      // Add card to collection
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: cardData.name,
          setId: cardData.set.id,
          cardNumber: cardData.localId,
          language: language,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsInCollection(true);
        showToast(`${cardData.name} added to your collection!`, 'success');
        if (onSuccess) {
          onSuccess();
        }
      } else if (response.status === 409) {
        // Card already in collection
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
      className={`${styles.addButton} ${isInCollection ? styles.inCollection : ''}`}
      onClick={handleAddToCollection}
      disabled={isLoading || isInCollection || isCheckingCollection}
    >
      {isCheckingCollection ? (
        <>
          <span className={styles.spinner}></span>
          Checking...
        </>
      ) : isLoading ? (
        <>
          <span className={styles.spinner}></span>
          Adding...
        </>
      ) : isInCollection ? (
        <>
          ✓ In Collection
        </>
      ) : (
        <>
          + Add to Collection
        </>
      )}
    </button>
  );
}
