'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInCollection, setIsInCollection] = useState(false);
  const [isCheckingCollection, setIsCheckingCollection] = useState(true);

  // Check if card is already in collection on mount
  useEffect(() => {
    if (user) {
      checkIfInCollection();
    } else {
      setIsCheckingCollection(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardData.id, language, user]);

  const checkIfInCollection = async () => {
    try {
      // Use optimized check endpoint instead of fetching entire collection
      const response = await fetch(
        `/api/cards/check?setId=${encodeURIComponent(cardData.set.id)}&cardNumber=${encodeURIComponent(cardData.localId)}&language=${language}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsInCollection(data.exists);
      }
    } catch (error) {
      console.error('Error checking collection:', error);
    } finally {
      setIsCheckingCollection(false);
    }
  };

  // Don't render if not logged in or still loading auth
  if (authLoading || !user) {
    return null;
  }

  const handleAddToCollection = async () => {
    setIsLoading(true);

    try {
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
