/**
 * Image fallback utility for Pokemon card images
 * Provides fallback image URLs from pokefetch.info when TCGdex images are unavailable
 * Uses our secure API endpoint that handles authorization with Bearer token
 */

/**
 * Generate pokefetch.info image URL through our secure API endpoint
 * This proxies the request through our backend which adds the Bearer token
 * pokefetch.info API: https://pokefetch.info/docs
 *
 * Uses simplified query format: https://pokefetch.info/pokemon?query={cardName}&limit=10&set={setId}
 */
export function generatePokefetchImageUrl(
  cardNumber: string | undefined,
  setId: string | undefined,
  cardName: string | undefined = undefined,
  setName: string | undefined = undefined,
  quality: 'high' | 'low' = 'high'
): string | null {
  if (!cardNumber || !setId) {
    return null;
  }

  // Clean the card number
  const cleanCardNumber = cardNumber.replace(/^0+/, '') || cardNumber;

  // Use our secure API endpoint that handles Bearer token authentication
  // Format: /api/pokefetch-image?setId={setId}&cardNumber={cardNumber}&cardName={cardName}&setName={setName}
  let apiUrl = `/api/pokefetch-image?setId=${encodeURIComponent(setId)}&cardNumber=${encodeURIComponent(cleanCardNumber)}`;

  if (cardName) {
    apiUrl += `&cardName=${encodeURIComponent(cardName)}`;
  }

  if (setName) {
    apiUrl += `&setName=${encodeURIComponent(setName)}`;
  }

  return apiUrl;
}

/**
 * Get image URL with TCGdex primary and pokefetch fallback
 */
export function getImageUrl(
  tcgdexImage: string | undefined,
  cardNumber: string | undefined,
  setId: string | undefined,
  cardName: string | undefined = undefined,
  setName: string | undefined = undefined,
  quality: 'high' | 'low' = 'high'
): {
  primary: string;
  fallback: string | null;
} {
  const primary = tcgdexImage ? `${tcgdexImage}/${quality}.webp` : null;
  const fallback = generatePokefetchImageUrl(cardNumber, setId, cardName, setName, quality);

  return {
    primary: primary || fallback || '',
    fallback
  };
}

/**
 * Get fallback image for a card
 * Checks localStorage for uploaded images first, then falls back to pokefetch.info
 */
export function getFallbackImage(
  cardNumber: string | undefined,
  setId: string | undefined,
  cardName: string | undefined = undefined,
  setName: string | undefined = undefined
): string | null {
  // First check if there's an uploaded image in localStorage
  if (typeof window !== 'undefined' && setId && cardNumber) {
    try {
      const imageMap = JSON.parse(localStorage.getItem('cardImageMap') || '{}');
      const cardKey = `${setId}-${cardNumber}`;
      if (imageMap[cardKey]) {
        return imageMap[cardKey];
      }
      // Also check by just the card ID
      if (imageMap[setId]) {
        return imageMap[setId];
      }
    } catch (error) {
      console.error('Error checking localStorage for images:', error);
    }
  }

  // Fall back to pokefetch
  return generatePokefetchImageUrl(cardNumber, setId, cardName, setName, 'high');
}
