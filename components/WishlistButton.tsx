'use client';

import { useState, useEffect } from 'react';
import { useToast } from './ToastProvider';
import styles from './WishlistButton.module.css';

interface WishlistButtonProps {
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

export default function WishlistButton({ cardData }: WishlistButtonProps) {
  const { showToast } = useToast();
  const [isInWishlist, setIsInWishlist] = useState(false);

  useEffect(() => {
    checkIfInWishlist();
  }, [cardData.id]);

  const checkIfInWishlist = () => {
    try {
      const stored = localStorage.getItem('wishlist');
      if (stored) {
        const cards = JSON.parse(stored);
        setIsInWishlist(cards.some((card: any) => card.id === cardData.id));
      }
    } catch (error) {
      console.error('Failed to check wishlist status:', error);
    }
  };

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const stored = localStorage.getItem('wishlist');
      let cards = stored ? JSON.parse(stored) : [];

      if (isInWishlist) {
        // Remove from wishlist
        cards = cards.filter((card: any) => card.id !== cardData.id);
        localStorage.setItem('wishlist', JSON.stringify(cards));
        setIsInWishlist(false);
        showToast(`${cardData.name} removed from wishlist`, 'success');
      } else {
        // Add to wishlist
        cards.push(cardData);
        localStorage.setItem('wishlist', JSON.stringify(cards));
        setIsInWishlist(true);
        showToast(`${cardData.name} added to wishlist`, 'success');
      }

      // Dispatch custom event for header badge update
      window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      showToast('Failed to update wishlist', 'error');
    }
  };

  return (
    <button
      onClick={toggleWishlist}
      className={`${styles.wishlistBtn} ${isInWishlist ? styles.active : ''}`}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {isInWishlist ? '★ In Wishlist' : '☆ Add to Wishlist'}
    </button>
  );
}
