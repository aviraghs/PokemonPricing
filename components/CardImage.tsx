import { useState } from 'react';

interface CardImageProps {
  card: {
    image?: string;
    name: string;
    set?: {
      id: string;
    };
  };
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Reusable CardImage component with intelligent fallback chain
 * Tries multiple image sources in order: high quality → low quality → set logo → placeholder
 */
export default function CardImage({ card, className, style, onClick }: CardImageProps) {
  const [imgSrc, setImgSrc] = useState(() => {
    if (card.image) {
      return `${card.image}/high.webp`;
    } else if (card.set?.id) {
      return `https://images.pokemontcg.io/${card.set.id}/logo.png`;
    }
    return '/card-back.svg';
  });

  const handleError = () => {
    // Try fallback chain based on current src
    if (imgSrc.includes('/high.webp') && card.image) {
      setImgSrc(`${card.image}/low.webp`);
    } else if (imgSrc.includes('/low.webp') && card.set?.id) {
      setImgSrc(`https://images.pokemontcg.io/${card.set.id}/logo.png`);
    } else if (imgSrc.includes('logo.png')) {
      setImgSrc('/card-back.svg');
    } else if (!imgSrc.includes('card-back.svg')) {
      // Final fallback if all else fails
      setImgSrc('/card-back.svg');
    }
  };

  return (
    <img
      src={imgSrc}
      alt={card.name}
      className={className}
      style={style}
      onClick={onClick}
      onError={handleError}
      loading="lazy"
    />
  );
}
