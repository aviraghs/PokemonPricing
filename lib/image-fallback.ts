/**
 * Image fallback utility for Pokemon card images
 * Provides fallback image URLs from pokefetch.info when TCGdex images are unavailable
 */

/**
 * Generate pokefetch.info image URL as fallback
 * pokefetch.info API: https://pokefetch.info/docs
 * Example: /api/v1/{setId}/{cardNumber}
 */
export function generatePokefetchImageUrl(
  cardNumber: string | undefined,
  setId: string | undefined,
  quality: 'high' | 'low' = 'high'
): string | null {
  if (!cardNumber || !setId) {
    return null;
  }

  // Clean the card number (remove any leading zeros for setId if needed)
  const cleanCardNumber = cardNumber.replace(/^0+/, '') || cardNumber;

  // pokefetch.info format: /api/v1/{setId}/{cardNumber}
  const baseUrl = 'https://pokefetch.info/api/v1';

  // Return the image URL - pokefetch provides webp by default
  return `${baseUrl}/${setId}/${cleanCardNumber}`;
}

/**
 * Get image URL with TCGdex primary and pokefetch fallback
 */
export function getImageUrl(
  tcgdexImage: string | undefined,
  cardNumber: string | undefined,
  setId: string | undefined,
  quality: 'high' | 'low' = 'high'
): {
  primary: string;
  fallback: string | null;
} {
  const primary = tcgdexImage ? `${tcgdexImage}/${quality}.webp` : null;
  const fallback = generatePokefetchImageUrl(cardNumber, setId, quality);

  return {
    primary: primary || fallback || '',
    fallback
  };
}

/**
 * Get fallback image for a card
 * Returns pokefetch.info image URL if available
 */
export function getFallbackImage(
  cardNumber: string | undefined,
  setId: string | undefined
): string | null {
  return generatePokefetchImageUrl(cardNumber, setId, 'high');
}
