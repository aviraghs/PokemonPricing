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
 * Note: pokefetch.info uses different setId format than TCGdex
 * TCGdex: sv06.5 -> pokefetch: sv6pt5 (dot becomes "pt")
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

  // Convert TCGdex setId format to pokefetch.info format
  // Example: sv06.5 -> sv6pt5 (remove leading zero after sv, replace . with pt)
  const pokefetchSetId = setId
    .replace(/^(sv)0(\d+)\.(\d+)$/, '$1$2pt$3') // sv06.5 -> sv6pt5
    .replace(/^(sv)(\d+)\.(\d+)$/, '$1$2pt$3')   // sv4.5 -> sv4pt5
    .replace(/(\d)\.(\d)/g, '$1pt$2');             // generic fallback for other patterns

  // Use our secure API endpoint that handles Bearer token authentication
  // Format: /api/pokefetch-image?setId={setId}&cardNumber={cardNumber}
  const apiUrl = `/api/pokefetch-image?setId=${encodeURIComponent(pokefetchSetId)}&cardNumber=${encodeURIComponent(cleanCardNumber)}`;

  return apiUrl;
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
