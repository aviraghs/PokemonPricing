'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import PokemonLoader from '@/components/PokemonLoader';
import { getFallbackImage } from '@/lib/image-fallback';
import styles from './page.module.css';

interface CardData {
  id: string;
  localId: string;
  name: string;
  image: string;
  rarity: string;
  types?: string[];
  hp?: string;
  set: {
    id: string;
    name: string;
    logo?: string;
  };
  attacks?: Array<{
    name: string;
    cost: string[];
    damage?: string;
    effect?: string;
  }>;
  weaknesses?: Array<{ type: string; value: string }>;
  resistances?: Array<{ type: string; value: string }>;
  retreat?: number;
  description?: string;
  illustrator?: string;
  regulationMark?: string;
  pricing?: {
    tcgPlayer?: {
      averagePrice: string | number;
      source: string;
      note?: string;
      // Detailed pricing structure for each variant (both camelCase and dash formats)
      holofoil?: {
        lowPrice: number | null;
        midPrice: number | null;
        highPrice: number | null;
        marketPrice: number | null;
        directLowPrice: number | null;
        avg?: number | null;
        averagePrice?: number | null;
      };
      'reverse-holofoil'?: {
        lowPrice: number | null;
        midPrice: number | null;
        highPrice: number | null;
        marketPrice: number | null;
        directLowPrice: number | null;
        avg?: number | null;
        averagePrice?: number | null;
      };
      reverseHolofoil?: {
        lowPrice: number | null;
        midPrice: number | null;
        highPrice: number | null;
        marketPrice: number | null;
        directLowPrice: number | null;
        avg?: number | null;
        averagePrice?: number | null;
      };
      normal?: {
        lowPrice: number | null;
        midPrice: number | null;
        highPrice: number | null;
        marketPrice: number | null;
        directLowPrice: number | null;
        avg?: number | null;
        averagePrice?: number | null;
      };
    };
    cardmarket?: {
      averagePrice: string | number;
      source: string;
      note?: string;
      // Cardmarket specific pricing fields
      avg?: number;
      low?: number;
      trend?: number;
      avg7?: number;
      avg30?: number;
      'avg-holo'?: number;
      'low-holo'?: number;
      'trend-holo'?: number;
      // Detailed pricing structure for each variant (both camelCase and dash formats)
      holofoil?: {
        lowPrice: number | null;
        midPrice: number | null;
        highPrice: number | null;
        marketPrice: number | null;
        directLowPrice: number | null;
      };
      'reverse-holofoil'?: {
        lowPrice: number | null;
        midPrice: number | null;
        highPrice: number | null;
        marketPrice: number | null;
        directLowPrice: number | null;
      };
      reverseHolofoil?: {
        lowPrice: number | null;
        midPrice: number | null;
        highPrice: number | null;
        marketPrice: number | null;
        directLowPrice: number | null;
      };
      normal?: {
        lowPrice: number | null;
        midPrice: number | null;
        highPrice: number | null;
        marketPrice: number | null;
        directLowPrice: number | null;
      };
    };
    pokemonPriceTracker?: {
      averagePrice: string | number;
      source: string;
      note?: string;
    };
    ebay?: {
      averagePrice: string | number;
      source: string;
      note?: string;
      listings?: Array<{
        title: string;
        sale_price: number;
        condition: string;
        date_sold: string;
        link: string;
      }>;
    };
  };
}

function CardDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEbayListings, setShowEbayListings] = useState(false);

  // Helper to get reverse holofoil data (handles both dash and camelCase formats)
  const getReverseHolofoilData = () => {
    return cardData?.pricing?.tcgPlayer?.reverseHolofoil || 
           cardData?.pricing?.tcgPlayer?.['reverse-holofoil'];
  };

  // Helper to get holofoil data 
  const getHolofoilData = () => {
    return cardData?.pricing?.tcgPlayer?.holofoil || 
           cardData?.pricing?.tcgPlayer?.['holofoil'];
  };

  // Helper to get normal data
  const getNormalData = () => {
    return cardData?.pricing?.tcgPlayer?.normal || 
           cardData?.pricing?.tcgPlayer?.['normal'];
  };

  // Helper for cardmarket reverse holofoil data
  const getCardmarketReverseHolofoilData = () => {
    return cardData?.pricing?.cardmarket?.reverseHolofoil ||
           cardData?.pricing?.cardmarket?.['reverse-holofoil'];
  };

  // Helper to format Cardmarket prices (EUR currency)
  const formatCardmarketPrice = (price: number | string | null | undefined) => {
    if (price == null || price === 'N/A') return 'N/A';
    // Check if already formatted (contains currency symbol)
    if (typeof price === 'string' && (price.includes('€') || price.includes('₹') || price.includes('$'))) {
      return price;
    }
    // Format as EUR with € symbol
    const numPrice = typeof price === 'number' ? price : parseFloat(price);
    if (isNaN(numPrice)) return 'N/A';
    return `€${numPrice.toFixed(2)}`;
  };

  const cardId = searchParams.get('id') || '';
  const lang = searchParams.get('lang') || 'en';

  useEffect(() => {
    if (cardId) {
      loadCardDetails();
    }
  }, [cardId, lang]);

  const loadCardDetails = async () => {
    setLoading(true);
    setError('');

    try {
      // First, get basic card details
      const response = await fetch(`/api/card-details/${cardId}?lang=${lang}`);

      if (!response.ok) {
        throw new Error('Failed to load card details');
      }

      const cardDetails = await response.json();
      
      // Then, get comprehensive pricing data using advanced search
      // Normalize pricing data to handle both dash and camelCase formats
      const normalizePricing = (pricing: any) => {
          if (!pricing) return pricing;
          
          const normalized = { ...pricing };
          
          // Normalize TCGPlayer pricing
          if (normalized.tcgPlayer) {
            const tcgPlayer = { ...normalized.tcgPlayer };
            
            // Ensure 'reverse-holofoil' data is available as 'reverseHolofoil' for backward compatibility
            if (tcgPlayer['reverse-holofoil'] && !tcgPlayer.reverseHolofoil) {
              tcgPlayer.reverseHolofoil = tcgPlayer['reverse-holofoil'];
            }
            // If both exist, prefer the camelCase version
            if (tcgPlayer['reverse-holofoil'] && tcgPlayer.reverseHolofoil) {
              // Merge them if needed, prefer the dash version if the camelCase is less detailed
              tcgPlayer.reverseHolofoil = { ...tcgPlayer['reverse-holofoil'], ...tcgPlayer.reverseHolofoil };
            }
            
            // Similarly for holofoil and normal variants
            if (tcgPlayer['holofoil'] && !tcgPlayer.holofoil) {
              tcgPlayer.holofoil = tcgPlayer['holofoil'];
            }
            if (tcgPlayer['holofoil'] && tcgPlayer.holofoil) {
              tcgPlayer.holofoil = { ...tcgPlayer['holofoil'], ...tcgPlayer.holofoil };
            }
            
            if (tcgPlayer['normal'] && !tcgPlayer.normal) {
              tcgPlayer.normal = tcgPlayer['normal'];
            }
            if (tcgPlayer['normal'] && tcgPlayer.normal) {
              tcgPlayer.normal = { ...tcgPlayer['normal'], ...tcgPlayer.normal };
            }
            
            normalized.tcgPlayer = tcgPlayer;
          }
          
          // Normalize Cardmarket pricing
          if (normalized.cardmarket) {
            const cardmarket = { ...normalized.cardmarket };
            
            // Ensure 'reverse-holofoil' data is available as 'reverseHolofoil' for backward compatibility
            if (cardmarket['reverse-holofoil'] && !cardmarket.reverseHolofoil) {
              cardmarket.reverseHolofoil = cardmarket['reverse-holofoil'];
            }
            if (cardmarket['reverse-holofoil'] && cardmarket.reverseHolofoil) {
              cardmarket.reverseHolofoil = { ...cardmarket['reverse-holofoil'], ...cardmarket.reverseHolofoil };
            }
            
            // Similarly for holofoil and normal variants
            if (cardmarket['holofoil'] && !cardmarket.holofoil) {
              cardmarket.holofoil = cardmarket['holofoil'];
            }
            if (cardmarket['holofoil'] && cardmarket.holofoil) {
              cardmarket.holofoil = { ...cardmarket['holofoil'], ...cardmarket.holofoil };
            }
            
            if (cardmarket['normal'] && !cardmarket.normal) {
              cardmarket.normal = cardmarket['normal'];
            }
            if (cardmarket['normal'] && cardmarket.normal) {
              cardmarket.normal = { ...cardmarket['normal'], ...cardmarket.normal };
            }
            
            normalized.cardmarket = cardmarket;
          }
          
          return normalized;
        };

      // Sanitize pricing data to remove unreasonable values
      const sanitizePricing = (pricing: any) => {
        if (!pricing) return pricing;

        const sanitized = JSON.parse(JSON.stringify(pricing));

        // Helper function to clean variant pricing
        const cleanVariantPricing = (variant: any) => {
          if (!variant) return variant;

          const cleaned = { ...variant };
          const priceFields = ['lowPrice', 'midPrice', 'highPrice', 'marketPrice', 'directLowPrice', 'avg', 'averagePrice'];

          for (const field of priceFields) {
            const value = cleaned[field];
            // Remove prices that are unreasonably high (> $5000) or invalid
            if (value && typeof value === 'string' && value.includes('₹')) {
              // Already formatted as INR, try to extract the numeric value
              const numericValue = parseFloat(value.replace(/[₹,]/g, ''));
              if (numericValue > 500000) { // Cap INR at 500k
                delete cleaned[field];
              }
            } else if (typeof value === 'number' && value > 5000) {
              // USD value over $5000 is likely an error
              delete cleaned[field];
            }
          }

          return cleaned;
        };

        // Clean TCGPlayer pricing
        if (sanitized.tcgPlayer) {
          const tcgPlayer = { ...sanitized.tcgPlayer };

          // Clean main price if unreasonable
          if (tcgPlayer.averagePrice && typeof tcgPlayer.averagePrice === 'string' && tcgPlayer.averagePrice.includes('₹')) {
            const numVal = parseFloat(tcgPlayer.averagePrice.replace(/[₹,]/g, ''));
            if (numVal > 500000) tcgPlayer.averagePrice = 'N/A';
          }

          // Clean variants
          for (const variantKey of ['holofoil', 'reverseHolofoil', 'reverse-holofoil', 'normal']) {
            if (tcgPlayer[variantKey]) {
              tcgPlayer[variantKey] = cleanVariantPricing(tcgPlayer[variantKey]);
            }
          }

          sanitized.tcgPlayer = tcgPlayer;
        }

        // Clean Cardmarket pricing similarly
        if (sanitized.cardmarket) {
          const cardmarket = { ...sanitized.cardmarket };

          if (cardmarket.averagePrice && typeof cardmarket.averagePrice === 'string' && cardmarket.averagePrice.includes('₹')) {
            const numVal = parseFloat(cardmarket.averagePrice.replace(/[₹,]/g, ''));
            if (numVal > 500000) cardmarket.averagePrice = 'N/A';
          }

          for (const variantKey of ['holofoil', 'reverseHolofoil', 'reverse-holofoil', 'normal']) {
            if (cardmarket[variantKey]) {
              cardmarket[variantKey] = cleanVariantPricing(cardmarket[variantKey]);
            }
          }

          sanitized.cardmarket = cardmarket;
        }

        return sanitized;
      };

      const pricingResponse = await fetch('/api/advanced-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cardDetails.name,
          cardId: cardDetails.id,
          cardNumber: cardDetails.localId,
          set: cardDetails.set?.name,
          language: lang
        }),
      });

      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();

        // Combine card details with comprehensive pricing data
        // Preserve TCGdex detailed pricing (which has dash format) but add other sources
        const combinedPricing = normalizePricing({
          // Use advanced search pricing if cardDetails has no valid price (N/A)
          tcgPlayer: (cardDetails.pricing?.tcgPlayer?.averagePrice &&
                     cardDetails.pricing?.tcgPlayer?.averagePrice !== 'N/A' &&
                     cardDetails.pricing?.tcgPlayer?.averagePrice !== 'N/S')
            ? cardDetails.pricing.tcgPlayer
            : pricingData.tcgPlayer,
          // Add other pricing sources from advanced search
          cardmarket: pricingData.cardmarket,
          pokemonPriceTracker: pricingData.pokemonPriceTracker,
          ebay: pricingData.ebay
        });

        setCardData({
          ...cardDetails,
          pricing: sanitizePricing(combinedPricing)
        });
      } else {
        // Normalize and sanitize card details pricing if it exists
        const normalizeCardDetailsPricing = (card: any) => {
          if (!card.pricing) return card;

          return {
            ...card,
            pricing: sanitizePricing(normalizePricing(card.pricing))
          };
        };

        // If advanced pricing fails, still show basic card details (with normalized and sanitized pricing if it exists)
        setCardData(normalizeCardDetailsPricing(cardDetails));
      }
    } catch (err) {
      setError('Failed to load card details. Please try again.');
      console.error('Card details error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <StickyHeader />
        <div className={styles.page}>
          <PokemonLoader message="Loading card details..." size="large" />
        </div>
      </>
    );
  }

  if (error || !cardData) {
    return (
      <>
        <StickyHeader />
        <div className={styles.page}>
          <div className={styles.error}>
            <p>{error || 'Card not found'}</p>
            <button onClick={() => router.push('/')} className={styles.backBtn}>
              Back to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StickyHeader />
      <div className={styles.page}>
        <div className={styles.container}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Back
          </button>

          <div className={styles.cardContainer}>
            {/* Card Image */}
            <div className={styles.imageSection}>
              <div className={styles.cardImageWrapper}>
                {cardData.image ? (
                  <img
                    src={`${cardData.image}/high.webp`}
                    alt={cardData.name}
                    className={styles.cardImage}
                    onError={(e) => {
                      // Fallback to low quality TCGdex image
                      if (e.currentTarget.src.includes('/high.webp')) {
                        e.currentTarget.src = `${cardData.image}/low.webp`;
                      } else {
                        // If low.webp also fails, try pokefetch.info
                        const pokefetchUrl = getFallbackImage(cardData.localId, cardData.set?.id);
                        if (pokefetchUrl && e.currentTarget.src !== pokefetchUrl) {
                          e.currentTarget.src = pokefetchUrl;
                        } else {
                          // If all fail, hide the image
                          e.currentTarget.style.display = 'none';
                        }
                      }
                    }}
                  />
                ) : (
                  // If no TCGdex image, try pokefetch.info directly
                  <img
                    src={getFallbackImage(cardData.localId, cardData.set?.id) || ''}
                    alt={cardData.name}
                    className={styles.cardImage}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>

            {/* Card Details */}
            <div className={styles.detailsSection}>
              <div className={styles.header}>
                <h1 className={styles.cardName}>{cardData.name}</h1>
                <div className={styles.cardNumber}>#{cardData.localId}</div>
              </div>

              {/* Pricing - Moved to top */}
              {cardData.pricing && (
                <div className={styles.pricingSection}>
                  <h3 className={styles.sectionTitle}>Current Market Prices</h3>
                  <div className={styles.pricingGrid}>
                    {/* TCGPlayer Pricing */}
                    {cardData.pricing.tcgPlayer && cardData.pricing.tcgPlayer.averagePrice && cardData.pricing.tcgPlayer.averagePrice !== 'N/A' && (
                      <div className={`${styles.priceCard} ${styles.tcgplayer}`}>
                        <div className={styles.priceCardHeader}>
                          <h4 className={styles.priceSource}>TCGPlayer</h4>
                        </div>
                        <div className={styles.priceAmount}>
                          {cardData.pricing.tcgPlayer.averagePrice}
                        </div>
                      </div>
                    )}
                    {(!cardData.pricing.tcgPlayer || !cardData.pricing.tcgPlayer.averagePrice || cardData.pricing.tcgPlayer.averagePrice === 'N/A' || cardData.pricing.tcgPlayer.averagePrice === 'N/S') && (
                      <div className={`${styles.priceCard} ${styles.tcgplayer}`}>
                        <div className={styles.priceCardHeader}>
                          <h4 className={styles.priceSource}>TCGPlayer</h4>
                        </div>
                        <div className={styles.priceAmount}>
                          N/S
                        </div>
                      </div>
                    )}

                    {/* eBay Pricing */}
                    <div>
                      {cardData.pricing.ebay && cardData.pricing.ebay.averagePrice && cardData.pricing.ebay.averagePrice !== 'N/A' && cardData.pricing.ebay.averagePrice !== 'N/S' && (
                        <>
                          <div
                            className={`${styles.priceCard} ${styles.ebay}`}
                            onClick={() => cardData.pricing?.ebay?.listings?.length ? setShowEbayListings(!showEbayListings) : null}
                            style={{ cursor: cardData.pricing?.ebay?.listings?.length ? 'pointer' : 'default' }}
                          >
                            <div className={styles.priceCardHeader}>
                              <h4 className={styles.priceSource}>
                                eBay {cardData.pricing.ebay?.listings?.length ? `(${cardData.pricing.ebay.listings.length} listings)` : ''}
                              </h4>
                            </div>
                            <div className={styles.priceAmount}>
                              {cardData.pricing.ebay.averagePrice}
                              {cardData.pricing.ebay?.listings?.length ? (
                                <span style={{ fontSize: '0.6em', marginLeft: '8px', opacity: 0.7 }}>
                                  {showEbayListings ? '▼' : '▶'}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* eBay Listings Dropdown */}
                          {showEbayListings && cardData.pricing.ebay?.listings && cardData.pricing.ebay.listings.length > 0 && (
                            <div className={styles.ebayListings}>
                              <h4 style={{ color: '#e0e0e0', marginBottom: '12px', fontSize: '0.9em' }}>
                                Recent Sales:
                              </h4>
                              {cardData.pricing.ebay.listings.map((listing, index) => (
                                <div key={index} className={styles.ebayItem}>
                                  <a href={listing.link} target="_blank" rel="noopener noreferrer" title={listing.title}>
                                    {listing.title}
                                  </a>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <span className={styles.ebayPrice}>${listing.sale_price}</span>
                                    <span style={{ fontSize: '0.75em', color: '#888' }}>
                                      {listing.condition}
                                    </span>
                                    <span style={{ fontSize: '0.7em', color: '#666' }}>
                                      {listing.date_sold}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {(!cardData.pricing.ebay || !cardData.pricing.ebay.averagePrice || cardData.pricing.ebay.averagePrice === 'N/A' || cardData.pricing.ebay.averagePrice === 'N/S') && (
                        <div className={`${styles.priceCard} ${styles.ebay}`}>
                          <div className={styles.priceCardHeader}>
                            <h4 className={styles.priceSource}>eBay</h4>
                          </div>
                          <div className={styles.priceAmount}>
                            N/S
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pokemon Price Tracker Pricing */}
                    {cardData.pricing.pokemonPriceTracker && cardData.pricing.pokemonPriceTracker.averagePrice && cardData.pricing.pokemonPriceTracker.averagePrice !== 'N/A' && cardData.pricing.pokemonPriceTracker.averagePrice !== 'N/S' && (
                      <div className={`${styles.priceCard} ${styles.pokemon}`}>
                        <div className={styles.priceCardHeader}>
                          <h4 className={styles.priceSource}>Price Charting</h4>
                        </div>
                        <div className={styles.priceAmount}>
                          {cardData.pricing.pokemonPriceTracker.averagePrice}
                        </div>
                      </div>
                    )}
                    {(!cardData.pricing.pokemonPriceTracker || !cardData.pricing.pokemonPriceTracker.averagePrice || cardData.pricing.pokemonPriceTracker.averagePrice === 'N/A' || cardData.pricing.pokemonPriceTracker.averagePrice === 'N/S') && (
                      <div className={`${styles.priceCard} ${styles.pokemon}`}>
                        <div className={styles.priceCardHeader}>
                          <h4 className={styles.priceSource}>Price Charting</h4>
                        </div>
                        <div className={styles.priceAmount}>
                          N/S
                        </div>
                      </div>
                    )}
                  </div>

                  {/* eBay Listings */}
                  {cardData.pricing.ebay && cardData.pricing.ebay.listings && cardData.pricing.ebay.listings.length > 0 && (
                    <div className={styles.ebayListings}>
                      <h4 style={{ marginTop: '20px', marginBottom: '15px', fontSize: '1.2em' }}>Recent eBay Sales</h4>
                      {cardData.pricing.ebay.listings.slice(0, 5).map((item: any, idx: number) => (
                        <div key={idx} className={styles.ebayItem}>
                          <a href={item.link} target="_blank" rel="noopener noreferrer" title={item.title}>
                            {item.title}
                          </a>
                          <span className={styles.ebayPrice}>{item.sale_price}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TCGdex Market Data */}
                  {(cardData.pricing?.tcgPlayer || cardData.pricing?.cardmarket) && (
                    <div style={{ marginTop: '30px' }}>
                      <h3 className={styles.sectionTitle}>TCGdex Market Data</h3>
                      <div className={styles.pricingGrid}>
                        {/* TCGPlayer Variants - Display all available variants */}
                        {cardData.pricing.tcgPlayer && (
                          <>
                            {/* Normal Variant */}
                            {getNormalData() && (
                              <div className={`${styles.priceCard} ${styles.tcgplayer}`}>
                                <div className={styles.priceCardHeader}>
                                  <h4 className={styles.priceSource}>TCGPlayer Normal</h4>
                                </div>
                                <div className={styles.priceAmount}>
                                  {getNormalData()?.marketPrice || getNormalData()?.avg || getNormalData()?.averagePrice || 'N/A'}
                                </div>
                                <div className={styles.variants}>
                                  {getNormalData()?.lowPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Low:</span>
                                      <span className={styles.variantPrice}>{getNormalData()?.lowPrice}</span>
                                    </div>
                                  )}
                                  {getNormalData()?.midPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Mid:</span>
                                      <span className={styles.variantPrice}>{getNormalData()?.midPrice}</span>
                                    </div>
                                  )}
                                  {getNormalData()?.highPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>High:</span>
                                      <span className={styles.variantPrice}>{getNormalData()?.highPrice}</span>
                                    </div>
                                  )}
                                  {getNormalData()?.directLowPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Direct Low:</span>
                                      <span className={styles.variantPrice}>{getNormalData()?.directLowPrice}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Holofoil Variant */}
                            {getHolofoilData() && (
                              <div className={`${styles.priceCard} ${styles.tcgplayer}`}>
                                <div className={styles.priceCardHeader}>
                                  <h4 className={styles.priceSource}>TCGPlayer Holofoil</h4>
                                </div>
                                <div className={styles.priceAmount}>
                                  {getHolofoilData()?.marketPrice || getHolofoilData()?.avg || getHolofoilData()?.averagePrice || 'N/A'}
                                </div>
                                <div className={styles.variants}>
                                  {getHolofoilData()?.lowPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Low:</span>
                                      <span className={styles.variantPrice}>{getHolofoilData()?.lowPrice}</span>
                                    </div>
                                  )}
                                  {getHolofoilData()?.midPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Mid:</span>
                                      <span className={styles.variantPrice}>{getHolofoilData()?.midPrice}</span>
                                    </div>
                                  )}
                                  {getHolofoilData()?.highPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>High:</span>
                                      <span className={styles.variantPrice}>{getHolofoilData()?.highPrice}</span>
                                    </div>
                                  )}
                                  {getHolofoilData()?.directLowPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Direct Low:</span>
                                      <span className={styles.variantPrice}>{getHolofoilData()?.directLowPrice}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Reverse Holofoil Variant */}
                            {getReverseHolofoilData() && (
                              <div className={`${styles.priceCard} ${styles.tcgplayer}`}>
                                <div className={styles.priceCardHeader}>
                                  <h4 className={styles.priceSource}>TCGPlayer Reverse Holofoil</h4>
                                </div>
                                <div className={styles.priceAmount}>
                                  {getReverseHolofoilData()?.marketPrice || 
                                   getReverseHolofoilData()?.avg || 
                                   getReverseHolofoilData()?.averagePrice || 'N/A'}
                                </div>
                                <div className={styles.variants}>
                                  {getReverseHolofoilData()?.lowPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Low:</span>
                                      <span className={styles.variantPrice}>{getReverseHolofoilData()?.lowPrice}</span>
                                    </div>
                                  )}
                                  {getReverseHolofoilData()?.midPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Mid:</span>
                                      <span className={styles.variantPrice}>{getReverseHolofoilData()?.midPrice}</span>
                                    </div>
                                  )}
                                  {getReverseHolofoilData()?.highPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>High:</span>
                                      <span className={styles.variantPrice}>{getReverseHolofoilData()?.highPrice}</span>
                                    </div>
                                  )}
                                  {getReverseHolofoilData()?.directLowPrice && (
                                    <div className={styles.variant}>
                                      <span className={styles.variantLabel}>Direct Low:</span>
                                      <span className={styles.variantPrice}>{getReverseHolofoilData()?.directLowPrice}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Cardmarket Data */}
                        {cardData.pricing.cardmarket && (
                          <div className={`${styles.priceCard} ${styles.pokemon}`}>
                            <div className={styles.priceCardHeader}>
                              <h4 className={styles.priceSource}>Cardmarket (EUR)</h4>
                            </div>
                            <div className={styles.priceAmount}>
                              {formatCardmarketPrice(cardData.pricing.cardmarket.avg || cardData.pricing.cardmarket.averagePrice)}
                            </div>
                            <div className={styles.variants}>
                              {cardData.pricing.cardmarket.low != null && typeof cardData.pricing.cardmarket.low !== 'object' && (
                                <div className={styles.variant}>
                                  <span className={styles.variantLabel}>Low:</span>
                                  <span className={styles.variantPrice}>{formatCardmarketPrice(cardData.pricing.cardmarket.low)}</span>
                                </div>
                              )}
                              {cardData.pricing.cardmarket.trend != null && typeof cardData.pricing.cardmarket.trend !== 'object' && (
                                <div className={styles.variant}>
                                  <span className={styles.variantLabel}>Trend:</span>
                                  <span className={styles.variantPrice}>{formatCardmarketPrice(cardData.pricing.cardmarket.trend)}</span>
                                </div>
                              )}
                              {cardData.pricing.cardmarket.avg7 != null && typeof cardData.pricing.cardmarket.avg7 !== 'object' && (
                                <div className={styles.variant}>
                                  <span className={styles.variantLabel}>7-Day Avg:</span>
                                  <span className={styles.variantPrice}>{formatCardmarketPrice(cardData.pricing.cardmarket.avg7)}</span>
                                </div>
                              )}
                              {cardData.pricing.cardmarket.avg30 != null && typeof cardData.pricing.cardmarket.avg30 !== 'object' && (
                                <div className={styles.variant}>
                                  <span className={styles.variantLabel}>30-Day Avg:</span>
                                  <span className={styles.variantPrice}>{formatCardmarketPrice(cardData.pricing.cardmarket.avg30)}</span>
                                </div>
                              )}
                              {cardData.pricing.cardmarket['avg-holo'] != null && typeof cardData.pricing.cardmarket['avg-holo'] !== 'object' && (
                                <div className={styles.variant}>
                                  <span className={styles.variantLabel}>Holo Avg:</span>
                                  <span className={styles.variantPrice}>{formatCardmarketPrice(cardData.pricing.cardmarket['avg-holo'])}</span>
                                </div>
                              )}
                              {cardData.pricing.cardmarket['low-holo'] != null && typeof cardData.pricing.cardmarket['low-holo'] !== 'object' && (
                                <div className={styles.variant}>
                                  <span className={styles.variantLabel}>Holo Low:</span>
                                  <span className={styles.variantPrice}>{formatCardmarketPrice(cardData.pricing.cardmarket['low-holo'])}</span>
                                </div>
                              )}
                              {cardData.pricing.cardmarket['trend-holo'] != null && typeof cardData.pricing.cardmarket['trend-holo'] !== 'object' && (
                                <div className={styles.variant}>
                                  <span className={styles.variantLabel}>Holo Trend:</span>
                                  <span className={styles.variantPrice}>{formatCardmarketPrice(cardData.pricing.cardmarket['trend-holo'])}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.metaInfo}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Set:</span>
                  <span
                    className={styles.metaValue}
                    style={{ cursor: 'pointer', color: '#667eea' }}
                    onClick={() =>
                      router.push(`/set-details?set=${cardData.set.id}&lang=${lang}`)
                    }
                  >
                    {cardData.set.name}
                  </span>
                </div>

                {cardData.rarity && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Rarity:</span>
                    <span className={styles.metaValue}>{cardData.rarity}</span>
                  </div>
                )}

                {cardData.types && cardData.types.length > 0 && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Type:</span>
                    <span className={styles.metaValue}>
                      {cardData.types.join(', ')}
                    </span>
                  </div>
                )}

                {cardData.hp && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>HP:</span>
                    <span className={styles.metaValue}>{cardData.hp}</span>
                  </div>
                )}

                {cardData.illustrator && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Illustrator:</span>
                    <span className={styles.metaValue}>{cardData.illustrator}</span>
                  </div>
                )}
              </div>

              {/* Attacks */}
              {cardData.attacks && cardData.attacks.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Attacks</h3>
                  {cardData.attacks.map((attack, idx) => (
                    <div key={idx} className={styles.attack}>
                      <div className={styles.attackHeader}>
                        <span className={styles.attackName}>{attack.name}</span>
                        {attack.damage && (
                          <span className={styles.attackDamage}>{attack.damage}</span>
                        )}
                      </div>
                      {attack.effect && (
                        <p className={styles.attackEffect}>{attack.effect}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Weaknesses & Resistances */}
              {((cardData.weaknesses && cardData.weaknesses.length > 0) ||
                (cardData.resistances && cardData.resistances.length > 0)) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Battle Stats</h3>
                  <div className={styles.battleStats}>
                    {cardData.weaknesses && cardData.weaknesses.length > 0 && (
                      <div className={styles.statGroup}>
                        <span className={styles.statLabel}>Weakness:</span>
                        {cardData.weaknesses.map((w, idx) => (
                          <span key={idx} className={styles.stat}>
                            {w.type} {w.value}
                          </span>
                        ))}
                      </div>
                    )}

                    {cardData.resistances && cardData.resistances.length > 0 && (
                      <div className={styles.statGroup}>
                        <span className={styles.statLabel}>Resistance:</span>
                        {cardData.resistances.map((r, idx) => (
                          <span key={idx} className={styles.stat}>
                            {r.type} {r.value}
                          </span>
                        ))}
                      </div>
                    )}

                    {cardData.retreat !== undefined && (
                      <div className={styles.statGroup}>
                        <span className={styles.statLabel}>Retreat:</span>
                        <span className={styles.stat}>{cardData.retreat}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {cardData.description && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Description</h3>
                  <p className={styles.description}>{cardData.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CardDetails() {
  return (
    <Suspense fallback={
      <>
        <StickyHeader />
        <div className={styles.page}>
          <PokemonLoader message="Loading..." size="large" />
        </div>
      </>
    }>
      <CardDetailsContent />
    </Suspense>
  );
}
