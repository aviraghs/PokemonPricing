import { NextRequest, NextResponse } from 'next/server';
import { RequestQueue, extractCardName, extractSetFromTitle } from '@/lib/card-helpers';

const pricingQueue = new RequestQueue(100);

// Get TCGdex set ID by name
async function getTCGdexSetIdByName(setName: string, language = 'en') {
  try {
    const response = await fetch(`https://api.tcgdex.net/v2/${language}/sets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch TCGdex sets for ${language}`);
    }
    const allSets = await response.json();

    // Filter out Pocket sets
    const filteredSets = allSets.filter((set: any) => {
      const logo = set.logo || '';
      const symbol = set.symbol || '';
      const setId = set.id || '';
      return !logo.includes('/tcgp/') &&
             !symbol.includes('/tcgp/') &&
             !setId.includes('tcgp') &&
             !/^A\d+/.test(setId) && // Exclude IDs starting with A followed by numbers
             setId !== 'A';
    });

    const set = filteredSets.find(
      (s: any) => s.name.toLowerCase() === setName.toLowerCase()
    );
    return set ? set.id : null;
  } catch (err) {
    console.error(`❌ Error getting TCGdex set ID for "${setName}":`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Get JustTCG set ID by name
async function getJustTCGSetIdByName(setName: string) {
  try {
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.error('❌ JUSTTCG_API_KEY not configured');
      return null;
    }

    const response = await fetch('https://api.justtcg.com/v1/sets?game=pokemon', {
      headers: {
        'X-API-Key': JUSTTCG_API_KEY
      }
    });
    if (!response.ok) {
      throw new Error(`JustTCG API returned ${response.status}`);
    }
    let data = await response.json();

    // Handle different response structures
    const justTcgSets = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

    if (!Array.isArray(justTcgSets)) {
      console.error('❌ Unexpected JustTCG sets response structure:', data);
      return null;
    }

    // Clean the set name for comparison
    const cleanSetName = setName.replace(/['"]/g, '').trim();
    const setLower = cleanSetName.toLowerCase();

    // Try exact match first
    let set = justTcgSets.find((s: any) => s.name && s.name.toLowerCase() === setLower);
    if (set) {
      console.log(`✅ Exact match found: "${set.name}" (ID: ${set.id})`);
      return set.id;
    }

    // Try partial match
    set = justTcgSets.find((s: any) =>
      s.name && (s.name.toLowerCase().includes(setLower) || setLower.includes(s.name.toLowerCase()))
    );
    if (set) {
      console.log(`✅ Partial match found: "${set.name}" (ID: ${set.id})`);
      return set.id;
    }

    console.log(`⚠️ No JustTCG set found matching: "${cleanSetName}"`);
    return null;
  } catch (err) {
    console.error('❌ Failed to get JustTCG set ID:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Fetch pricing data for a card
async function fetchTCGPlayerDataFromTCGAPI(title: string, cardId: string | null, cardNumber: string | null, set: string | null, language = 'en') {
  try {
    let tcgdexUrl;
    let cardIdentifier = cardId;

    if (!cardIdentifier && set && cardNumber) {
      const cardSetId = await getTCGdexSetIdByName(set, language);
      if (cardSetId) {
        cardIdentifier = `${cardSetId}-${cardNumber}`;
        console.log(`🔧 Constructed Card ID: ${cardIdentifier}`);
      } else {
        console.log(`⚠️ Could not find a set ID for "${set}" in ${language}`);
        // Try JustTCG as fallback
        console.log('🔄 Trying JustTCG as fallback...');
        return await fetchJustTCGData(title, cardNumber, set);
      }
    }

    if (!cardIdentifier) {
      return { averagePrice: 'N/A', source: 'TCGplayer', note: 'Card ID or Set/Number are required.' };
    }

    tcgdexUrl = `https://api.tcgdex.net/v2/${language}/cards/${cardIdentifier}`;
    console.log(`🔍 Fetching from TCGdex (${language}): ${tcgdexUrl}`);

    const tcgdexResponse = await fetch(tcgdexUrl);
    if (!tcgdexResponse.ok) {
      console.log(`⚠️ TCGdex fetch failed with status: ${tcgdexResponse.status}`);
      // Try JustTCG as fallback
      if (cardNumber && set) {
        console.log('🔄 Trying JustTCG as fallback...');
        return await fetchJustTCGData(title, cardNumber, set);
      }
      return { averagePrice: 'N/A', source: 'TCGplayer', note: `Card not found in TCGdex (${tcgdexResponse.status})` };
    }

    const cardData = await tcgdexResponse.json();
    const prices = cardData?.pricing?.tcgplayer;
    let price = 'N/A';
    let priceType = 'N/A';

    if (prices?.holofoil?.marketPrice) {
        price = prices.holofoil.marketPrice;
        priceType = 'Holofoil Market';
    } else if (prices?.reverseHolofoil?.marketPrice) {
        price = prices.reverseHolofoil.marketPrice;
        priceType = 'Reverse Holofoil Market';
    } else if (prices?.normal?.marketPrice) {
        price = prices.normal.marketPrice;
        priceType = 'Normal Market';
    } else {
        const firstAvailable = Object.values(prices || {}).find((p: any) => p && p.marketPrice) as any;
        if (firstAvailable) {
            price = firstAvailable.marketPrice;
            priceType = 'Fallback Market';
        }
    }

    if (price !== 'N/A') {
      console.log(`✅ Found TCGplayer price from TCGdex: ${price} (${priceType})`);
      return { averagePrice: price, source: 'TCGplayer (TCGdex)', cardName: cardData.name, language };
    } else {
      console.log('⚠️ No TCGplayer market price found in TCGdex response.');
      // Try JustTCG as fallback
      if (cardNumber && set) {
        console.log('🔄 Trying JustTCG as fallback...');
        const justTcgResult = await fetchJustTCGData(title, cardNumber, set);
        if (justTcgResult.averagePrice && justTcgResult.averagePrice !== 'N/A') {
          return justTcgResult;
        }
      }
      return { averagePrice: 'N/A', source: 'TCGplayer', cardName: cardData.name, note: 'Price unavailable', language };
    }

  } catch (err) {
    console.error('❌ TCGdex/TCGplayer fetch error:', err);
    // Try JustTCG as final fallback
    if (cardNumber && set) {
      console.log('🔄 Trying JustTCG as fallback after error...');
      return await fetchJustTCGData(title, cardNumber, set);
    }
    return { averagePrice: 'N/A', source: 'TCGplayer' };
  }
}

// Fetch JustTCG data for a card
async function fetchJustTCGData(title: string, cardNumber: string | null, set: string | null) {
  try {
    // Check for API key first
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.log('⚠️  JUSTTCG_API_KEY not configured - cannot fetch from JustTCG');
      return { averagePrice: 'N/A', source: 'JustTCG', note: 'API key not configured' };
    }

    if (!cardNumber || !set || set === 'Unknown' || set === 'Unknown Set') {
      console.log('⚠️  JustTCG requires card number and set name');
      return { averagePrice: 'N/A', source: 'JustTCG', note: 'Missing card number or set' };
    }

    console.log(`🔍 Searching JustTCG for: ${title} #${cardNumber} in ${set}`);

    const justTcgSetId = await getJustTCGSetIdByName(set);
    if (!justTcgSetId) {
      console.log(`⚠️  Could not find JustTCG set matching "${set}"`);
      return { averagePrice: 'N/A', source: 'JustTCG', note: `Set "${set}" not found on JustTCG` };
    }

    const cardResult = await findCardOnJustTCG(title, justTcgSetId, cardNumber);
    if (!cardResult) {
      console.log(`⚠️  Card #${cardNumber} not found in JustTCG set ${justTcgSetId}`);
      return { averagePrice: 'N/A', source: 'JustTCG', note: `Card #${cardNumber} not found in ${set}` };
    }

    if (!cardResult.variants || cardResult.variants.length === 0) {
      console.log('⚠️  No variants found for this card');
      return { averagePrice: 'N/A', source: 'JustTCG', cardName: cardResult.name, note: 'No variants found' };
    }

    const nearMintVariant = cardResult.variants.find((v: any) => v.id.toLowerCase().includes('near-mint'));
    if (!nearMintVariant) {
      console.log('⚠️  No Near-Mint variant found');
      return { averagePrice: 'N/A', source: 'JustTCG', cardName: cardResult.name, note: 'No Near-Mint variant found' };
    }

    const price = nearMintVariant.price;
    if (!price) {
      console.log('⚠️  No price available on Near-Mint variant');
      return { averagePrice: 'N/A', source: 'JustTCG', cardName: cardResult.name, note: 'Price unavailable' };
    }

    console.log(`✅ Found Near-Mint price from JustTCG: ${price} for ${cardResult.name}`);

    return {
      averagePrice: parseFloat(price),
      source: 'TCGplayer (JustTCG)',
      cardName: cardResult.name,
      cardNumber: cardResult.number,
      setName: set
    };

  } catch (err) {
    console.error('❌ JustTCG fetch error:', err instanceof Error ? err.message : String(err));
    return { averagePrice: 'N/A', source: 'JustTCG' };
  }
}

// Find card on JustTCG
async function findCardOnJustTCG(cardQuery: string, justTcgSetId: string, tcgdexCardNumber: string) {
  try {
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.error('❌ JUSTTCG_API_KEY not configured');
      return null;
    }

    const cleanedCardName = extractCardName(cardQuery);

    console.log(`🔍 Searching JustTCG for: ${cleanedCardName} in set ID: ${justTcgSetId}, card #: ${tcgdexCardNumber}`);

    // First, try the provided set
    const searchUrl = `https://api.justtcg.com/v1/cards?q=${encodeURIComponent(cleanedCardName)}&game=pokemon&set=${justTcgSetId}`;
    console.log(`🔍 Searching main set: ${searchUrl}`);

    let results: any[] = [];

    try {
      const searchResponse = await fetch(searchUrl, {
        headers: { 'X-API-Key': JUSTTCG_API_KEY }
      });

      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        results = Array.isArray(searchResults.data) ? searchResults.data : Array.isArray(searchResults) ? searchResults : [];
        console.log(`📊 Found ${results.length} results in main set`);
      } else {
        console.log(`⚠️ Main set search failed: ${searchResponse.status}`);
      }
    } catch (err) {
      console.log(`⚠️  Main set search failed: ${(err as Error).message}, will try subsets`);
    }

    // If no results in main set, try related subsets
    if (!results || results.length === 0) {
      console.log(`⚠️  No results in main set, attempting subset search...`);

      // Check if this is a set with known subsets (e.g., Crown Zenith)
      const relatedSubsets = await findRelatedSubsets(justTcgSetId);

      if (relatedSubsets && relatedSubsets.length > 0) {
        console.log(`🔄 Trying ${relatedSubsets.length} related subsets...`);

        for (const subsetId of relatedSubsets) {
          console.log(`🔍 Checking subset: ${subsetId}`);
          const subsetUrl = `https://api.justtcg.com/v1/cards?q=${encodeURIComponent(cleanedCardName)}&game=pokemon&set=${subsetId}`;

          try {
            const subsetResponse = await fetch(subsetUrl, {
              headers: { 'X-API-Key': JUSTTCG_API_KEY }
            });

            if (subsetResponse.ok) {
              const subsetResults = await subsetResponse.json();
              const subsetData = Array.isArray(subsetResults.data) ? subsetResults.data : 
                                Array.isArray(subsetResults) ? subsetResults : [];

              if (subsetData && subsetData.length > 0) {
                console.log(`✅ Found ${subsetData.length} results in subset: ${subsetId}`);
                results = subsetData;
                break; // Found results, stop searching
              } else {
                console.log(`   No results in subset: ${subsetId}`);
              }
            } else {
              console.log(`   Subset ${subsetId} returned status: ${subsetResponse.status}`);
            }
          } catch (err) {
            console.log(`   Failed to check subset ${subsetId}: ${(err as Error).message}`);
          }
        }
      }

      // If still no results after checking subsets, also try searching without the set restriction
      if (!results || results.length === 0) {
        console.log(`⚠️  No results in main set or related subsets, trying search without set restriction...`);

        try {
          // Search without set restriction to find the card anywhere
          const unrestrictedUrl = `https://api.justtcg.com/v1/cards?q=${encodeURIComponent(cleanedCardName)}&game=pokemon`;
          console.log(`🔍 Unrestricted search: ${unrestrictedUrl}`);

          const unrestrictedResponse = await fetch(unrestrictedUrl, {
            headers: { 'X-API-Key': JUSTTCG_API_KEY }
          });

          if (unrestrictedResponse.ok) {
            const unrestrictedResults = await unrestrictedResponse.json();
            const unrestrictedData = Array.isArray(unrestrictedResults.data) ? unrestrictedResults.data : 
                                    Array.isArray(unrestrictedResults) ? unrestrictedResults : [];

            if (unrestrictedData && unrestrictedData.length > 0) {
              // Filter by card name more specifically
              const nameMatches = unrestrictedData.filter((card: any) =>
                card.name && card.name.toLowerCase().includes(cleanedCardName.toLowerCase())
              );

              // If we found name matches, use those
              if (nameMatches.length > 0) {
                console.log(`✅ Found ${nameMatches.length} name matches in unrestricted search`);
                results = nameMatches;
              } else {
                console.log(`⚠️  Unrestricted search found cards but no name matches: ${unrestrictedData.length} total`);
                // Use the original unrestricted results as a fallback
                results = unrestrictedData;
              }
            } else {
              console.log(`⚠️  Unrestricted search returned no results`);
            }
          } else {
            console.log(`⚠️  Unrestricted search returned status: ${unrestrictedResponse.status}`);
          }
        } catch (err) {
          console.log(`⚠️  Unrestricted search failed: ${(err as Error).message}`);
        }
      }

      // If still no results after all attempts, return null
      if (!results || results.length === 0) {
        console.log(`❌ No results found after trying main set, related subsets, and unrestricted search`);
        return null;
      }
    }

    console.log(`✅ Processing ${results.length} potential matches. Filtering by card number...`);

    // Normalize card numbers for comparison (remove leading zeros, uppercase)
    const normalizeCardNumber = (num: string) => num.replace(/^0+/, '').toUpperCase();
    const targetCardNumber = normalizeCardNumber(tcgdexCardNumber);
    console.log(`🔍 Looking for card number: ${targetCardNumber}`);

    const matchingCards = results.filter((card: any) => {
      if (!card.number) return false;

      // Try exact alphanumeric match first (for cards like GG44, TG30, etc.)
      const cardNumber = normalizeCardNumber(card.number.split('/')[0]); // Get number before slash if present
      if (cardNumber === targetCardNumber) {
        return true;
      }

      // Fall back to numeric-only matching for regular numbered cards
      if (/^\d+$/.test(targetCardNumber) && /^\d+/.test(cardNumber)) {
        const targetNum = parseInt(targetCardNumber, 10);
        const match = cardNumber.match(/^(\d+)/);
        if (match) {
          const itemNum = parseInt(match[1], 10);
          return itemNum === targetNum;
        }
      }

      return false;
    });

    if (matchingCards.length === 0) {
      console.log(`⚠️  Could not find any cards matching number "${tcgdexCardNumber}"`);

      // As a fallback, just take the first card that matches the name if we can't find by number
      const nameMatchCards = results.filter((card: any) =>
        card.name && card.name.toLowerCase().includes(cleanedCardName.toLowerCase())
      );

      if (nameMatchCards.length > 0) {
        console.log(`✅ Falling back to first name match for: ${cleanedCardName}`);
        matchingCards.push(nameMatchCards[0]);
      } else {
        console.log(`❌ No name matches found either`);
        return null;
      }
    }

    console.log(`✅ Using card: ${matchingCards[0].name} #${matchingCards[0].number} (${matchingCards[0].id})`);

    // --- Strict Near-Mint variantId selection only ---
    const selectedCard = matchingCards[0]; // pick the first match, no condition logic

    if (!Array.isArray(selectedCard.variants) || selectedCard.variants.length === 0) {
      console.log(`ℹ️ No variants array — cannot select 'near-mint' variant`);
      return null;
    }

    const nmVariant = selectedCard.variants.find(
      (v: any) => typeof v.id === 'string' && /near[-\s]?mint/i.test(v.id)
    );

    if (!nmVariant || !nmVariant.id) {
      console.log(`⚠️ No variant ID containing 'near-mint' found — trying to find first price variant`);

      // If no near-mint variant, try to find any variant with a price
      const firstPriceVariant = selectedCard.variants.find((v: any) => v.price && !isNaN(v.price));
      if (firstPriceVariant && firstPriceVariant.id) {
        console.log(`✅ Using first available variant with price: ${firstPriceVariant.id}`);
        (nmVariant as any) = firstPriceVariant;
      } else {
        console.log(`⚠️ No variants with price found`);
        return null;
      }
    }

    const variantId = (nmVariant as any).id;
    console.log(`✅ Using variant ID: ${variantId}`);

    console.log(`🔄 Fetching full details for variantId: ${variantId}`);
    const cardUrl = `https://api.justtcg.com/v1/cards?variantId=${variantId}`;
    const cardResponse = await fetch(cardUrl, {
      headers: { 'X-API-Key': JUSTTCG_API_KEY }
    });

    if (!cardResponse.ok) {
      console.log(`⚠️  Could not fetch card details from JustTCG (${cardResponse.status})`);
      return null;
    }

    const cardData = await cardResponse.json();
    const cardResult = (Array.isArray(cardData.data) && cardData.data[0]) || (Array.isArray(cardData) && cardData[0]);

    if (!cardResult) {
      console.log(`⚠️  No card data returned for variantId ${variantId}`);
      return null;
    }

    return cardResult;

  } catch (err) {
    console.error('❌ Error finding card on JustTCG:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Find related subsets for a given set
async function findRelatedSubsets(setId: string) {
  try {
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.error('❌ JUSTTCG_API_KEY not configured');
      return [];
    }

    // Get all sets to look for related subsets
    const response = await fetch('https://api.justtcg.com/v1/sets?game=pokemon', {
      headers: { 'X-API-Key': JUSTTCG_API_KEY }
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch JustTCG sets: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const sets = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

    if (!sets || sets.length === 0) {
      return [];
    }

    // Find the original set
    const originalSet = sets.find((s: any) => s.id === setId);
    if (!originalSet || !originalSet.name) {
      return [];
    }

    const originalName = originalSet.name.toLowerCase();
    console.log(`🔍 Looking for subsets of: "${originalSet.name}" (ID: ${setId})`);

    // Extract base set name for matching (remove common suffixes like "pokemon", "tcg", etc.)
    let baseName = originalName
      .replace(/\s*-?\s*(pokemon|tcg|gallery|base|expansion|subset)\s*$/i, '')
      .trim();

    // Find all sets that are related as subsets
    const relatedSets = sets.filter((s: any) => {
      if (s.id === setId) return false; // Skip the original set
      if (!s.name) return false;

      const setName = s.name.toLowerCase();

      // Check if this set name starts with the original set name (like "Crown Zenith" matching "Crown Zenith Galarian Gallery")
      const isSubset = setName.startsWith(originalName) && setName !== originalName;

      // Also check if it matches the base name pattern
      const matchesBase = setName.includes(baseName) && setName !== baseName;

      return isSubset || matchesBase;
    });

    console.log(`   Found ${relatedSets.length} related subsets:`, relatedSets.map((s: any) => s.name));

    return relatedSets.map((s: any) => s.id);
  } catch (err) {
    console.error('❌ Error finding related subsets:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// Fetch Pokemon Price Tracker data for a card
async function fetchPokemonPriceTrackerData(title: string, cardNumber: string | null, set: string | null, language = 'en') {
  try {
    const POKEMONPRICETRACKER_API_KEY = process.env.POKEMONPRICETRACKER_API_KEY;
    if (!POKEMONPRICETRACKER_API_KEY) {
      console.log('⚠️  POKEMONPRICETRACKER_API_KEY not configured');
      return { averagePrice: 'N/A', source: 'Pokemon Price Tracker' };
    }

    const cleanedCardName = extractCardName(title);
    let searchName = '';
    const words = cleanedCardName.split(' ');
    if (words.length > 1 && words[0].toLowerCase().includes('team')) {
        searchName = words[words.length - 1];
    } else {
        searchName = words.slice(0, 2).join(' ');
    }
    console.log(`🔪 Using smart name for Pokemon Price Tracker: "${searchName}"`);

    const searchUrl = new URL('https://www.pokemonpricetracker.com/api/v2/cards');
    searchUrl.searchParams.append('limit', '5');

    if (set && set !== 'Unknown' && set !== 'Unknown Set') {
      console.log(`🔍 Using Set Name for Search: "${set}"`);
      searchUrl.searchParams.append('search', searchName);
      searchUrl.searchParams.append('set', set);
    } else {
      searchUrl.searchParams.append('search', searchName);
    }

    console.log(`🔍 Pokemon Price Tracker Search URL: ${searchUrl.toString()}`);

    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POKEMONPRICETRACKER_API_KEY}`,
      }
    });

    if (!response.ok) {
      console.log(`⚠️  Pokemon Price Tracker API returned ${response.status}`);
      return { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (!data || !data.data || data.data.length === 0) {
      console.log('📊 Pokemon Price Tracker returned 0 results');
      return { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note: 'No matching cards found' };
    }

    console.log(`📊 Pokemon Price Tracker returned ${data.data.length} results`);

    let cardToUse = null;

    if (cardNumber) {
      console.log(`🔍 Searching for card number: ${cardNumber}`);
      const exactMatch = data.data.find((card: any) => card.cardNumber === cardNumber);
      if (exactMatch) {
        console.log(`✅ Found exact match by card number: ${exactMatch.name} #${exactMatch.cardNumber}`);
        cardToUse = exactMatch;
      } else {
        console.log(`⚠️ Card number #${cardNumber} not found. Falling back to first result.`);
        cardToUse = data.data[0];
      }
    } else {
      cardToUse = data.data[0];
    }

    if (!cardToUse) {
        const note = 'No cards found in API response.';
        console.log(`⚠️ ${note}`);
        return { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note };
    }

    const price = cardToUse.prices?.market;

    if (price !== null && price !== undefined) {
      console.log(`✅ Found Pokemon Price Tracker price: $${price} for ${cardToUse.name}`);
      return {
        averagePrice: parseFloat(price),
        source: 'Pokemon Price Tracker',
        cardName: cardToUse.name,
        cardNumber: cardToUse.cardNumber,
        setName: cardToUse.set?.name || set
      };
    } else {
      console.log(`⚠️  No market price available for ${cardToUse.name}`);
      return {
        averagePrice: 'N/A',
        source: 'Pokemon Price Tracker',
        cardName: cardToUse.name,
        note: 'Price unavailable'
      };
    }

  } catch (err) {
    console.error('❌ Pokemon Price Tracker fetch error:', err instanceof Error ? err.message : String(err));
    return { averagePrice: 'N/A', source: 'Pokemon Price Tracker' };
  }
}

// Fetch eBay data for a card
async function fetchEbayData(title: string, cardNumber: string | null, set: string | null) {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) {
      console.log('⚠️  RAPIDAPI_KEY not configured for eBay - cannot fetch from eBay');
      return { averagePrice: 'N/A', source: 'eBay', note: 'API key not configured' };
    }
    
    const cleanedCardName = extractCardName(title);
    let searchQuery = cleanedCardName;
    if (cardNumber) {
      searchQuery += ` ${cardNumber}`;
      console.log(`🔍 Card number: "${cardNumber}"`);
    }
    if (set && set !== 'Unknown' && set !== 'Unknown Set') {
      searchQuery += ` ${set}`;
      console.log(`🔍 Set: "${set}"`);
    }
    console.log(`🔍 eBay search query: "${searchQuery}"`);

    const response = await fetch('https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'ebay-average-selling-price.p.rapidapi.com'
      },
      body: JSON.stringify({ keywords: searchQuery, max_search_results: 240 })
    });

    if (!response.ok) {
      console.log(`⚠️  eBay API returned ${response.status}`);
      return { averagePrice: 'N/A', source: 'eBay', note: `API error: ${response.status}` };
    }

    const apiData = await response.json();
    const items = apiData.products || apiData.items || [];
    console.log(`📊 eBay returned ${items.length} total items`);

    const cardName = extractCardName(title);
    const normalizeNum = (num: string) => num ? num.replace(/^0+/, '').toLowerCase() : '';
    const targetCardNum = cardNumber ? normalizeNum(cardNumber) : null;

    console.log(`🎯 Strict matching for:`);
    console.log(`   Card Name: "${cardName}"`);
    if (targetCardNum) console.log(`   Card #: ${targetCardNum}`);
    if (set && set !== 'Unknown' && set !== 'Unknown Set') console.log(`   Set: ${set}`);

    const gradingCompanies = ['psa', 'cgc', 'bgs', 'tag', 'ace'];
    const irrelevantTerms = ['lot', 'bundle', 'collection', 'booster', 'pack', 'box', 'sealed', 'case', 'complete set'];

    const relevantCards = items.filter((item: any, index: number) => {
      const itemTitle = (item.title || '').toLowerCase();
      console.log(`\n--- Filtering item ${index + 1}: "${item.title}" ---`);

      if (gradingCompanies.some((co: string) => itemTitle.includes(co)) || /\b(psa|cgc|bgs|tag|ace)\s+\d+/i.test(itemTitle)) {
        console.log('  Excluded: Graded card');
        return false;
      }

      if (irrelevantTerms.some((term: string) => itemTitle.includes(term))) {
        console.log('  Excluded: Irrelevant term (lot, sealed, etc.)');
        return false;
      }

      const cardNameLower = cardName.toLowerCase();
      const cardNameWords = cardNameLower.split(' ').filter((w: string) => w.length > 2);
      const allWordsPresent = cardNameWords.every((word: string) => itemTitle.includes(word));

      if (!allWordsPresent) {
        console.log(`  Excluded: Card name words not all present. Missing: ${cardNameWords.filter((word: string) => !itemTitle.includes(word)).join(', ')}`);
        return false;
      }

      if (targetCardNum) {
        const numPatterns = [
          /\b(\d+)\/\d+\b/,
          /#(\d+)\b/,
          /\bno\.?\s*(\d+)\b/i,
          /\bnumber\s+(\d+)\b/i
        ];
        let foundMatchingNum = false;
        let foundConflictingNum = false;

        for (const pattern of numPatterns) {
          const match = itemTitle.match(pattern);
          if (match) {
            const itemNum = normalizeNum(match[1]);
            if (itemNum === targetCardNum) {
              foundMatchingNum = true;
              break;
            } else {
              foundConflictingNum = true;
              break;
            }
          }
        }

        if (foundConflictingNum) {
          console.log(`  Excluded: Conflicting card number found. Expected: ${targetCardNum}`);
          return false;
        }
      }

      if (set && set !== 'Unknown' && set !== 'Unknown Set') {
        const setLower = set.toLowerCase();
        const setWords = setLower.split(' ').filter((w: string) => w.length > 2);
        if (!itemTitle.includes(setLower)) {
          const setWordsPresent = setWords.filter((word: string) => itemTitle.includes(word));
          if (setWordsPresent.length < Math.ceil(setWords.length * 0.6)) {
            console.log(`  Excluded: Set name mismatch. Expected: ${setLower}, Found words: ${setWordsPresent.join(', ')}`);
            return false;
          }
        }
      }

      const price = item.sale_price || item.currentPrice?.value || 0;
      if (price <= 0 || price > 100000) {
        console.log(`  Excluded: Price out of range: ${price}`);
        return false;
      }

      console.log('  ✅ Matched');
      return true;
    });

    console.log(`✅ After strict filtering: ${relevantCards.length} matching cards`);

    if (relevantCards.length === 0) {
      console.log('⚠️  No cards matched all criteria');
      return {
        averagePrice: 'N/A',
        listings: [],
        source: 'eBay',
        note: `No exact matches found for ${cardName}${targetCardNum ? ` #${targetCardNum}` : ''}${set && set !== 'Unknown' ? ` (${set})` : ''}`
      };
    }

    const recentSold = relevantCards.slice(0, 5).map((item: any) => ({
      title: (item.title || 'Unknown').replace(/Opens in a new window or tab/gi, '').trim(),
      sale_price: item.sale_price || item.currentPrice?.value || 0,
      condition: item.condition?.conditionDisplayName || 'Unknown',
      date_sold: item.date_sold || 'Unknown',
      link: item.link || '#'
    }));

    const allPrices = relevantCards.map((item: any) => item.sale_price || item.currentPrice?.value || 0).filter((p: number) => p > 0);
    const averagePrice = allPrices.reduce((sum: number, price: number) => sum + price, 0) / allPrices.length;

    console.log(`💰 Average: $${averagePrice.toFixed(2)} from ${relevantCards.length} sales`);
    console.log(`📋 Showing top ${recentSold.length} recent sales`);

    return {
      averagePrice: parseFloat(averagePrice.toFixed(2)),
      listings: recentSold,
      source: 'eBay',
      filteredFrom: items.length,
      matchedCards: relevantCards.length
    };
  } catch (err) {
    console.error('❌ eBay fetch error:', err);
    return { averagePrice: 'N/A', source: 'eBay' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, cardId, cardNumber, set, rarity, language = 'en' } = await request.json();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔎 SEARCH REQUEST`);
    console.log(`Incoming Title: "${title}"`);
    console.log(`Incoming Card ID: ${cardId || 'N/A'}`);
    console.log(`Incoming Card #: ${cardNumber || 'N/A'}`);
    console.log(`Incoming Set: ${set || 'N/A'}`);
    console.log(`Incoming Rarity: ${rarity || 'N/A'}`);
    console.log(`Incoming Language: ${language}`);
    console.log(`${'='.repeat(50)}\n`);

    const finalSet = set || extractSetFromTitle(title);

    console.log('📍 Fetching eBay data...');
    const ebayData = await fetchEbayData(title, cardNumber, finalSet);
    console.log('✅ eBay complete');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📍 Fetching TCGdex/TCGplayer data...');
    const tcgPlayerData = await fetchTCGPlayerDataFromTCGAPI(title, cardId, cardNumber, finalSet, language);
    console.log('✅ TCGdex complete');

    // If TCGdex has no price, try JustTCG as fallback
    let finalTCGPlayerData = tcgPlayerData;
    if ((!tcgPlayerData.averagePrice || tcgPlayerData.averagePrice === 'N/A') && process.env.JUSTTCG_API_KEY) {
      console.log('📍 TCGdex price unavailable, trying JustTCG fallback...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const justTcgData = await fetchJustTCGData(title, cardNumber, finalSet);
      if (justTcgData.averagePrice && justTcgData.averagePrice !== 'N/A') {
        console.log('✅ JustTCG fallback successful');
        finalTCGPlayerData = justTcgData;
      }
    }
    console.log('✅ JustTCG check complete');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📍 Fetching Pokemon Price Tracker data...');
    const pokemonPriceTrackerData = await fetchPokemonPriceTrackerData(title, cardNumber, finalSet, language);
    console.log('✅ Pokemon Price Tracker complete');

    const result = {
      title,
      set: finalSet,
      cardNumber: cardNumber || 'N/A',
      language,
      ebay: ebayData,
      pokemonPriceTracker: pokemonPriceTrackerData,
      tcgPlayer: finalTCGPlayerData,
      lastUpdated: new Date().toISOString()
    };

    console.log(`${'='.repeat(50)}`);
    console.log(`✅ SEARCH COMPLETE`);
    console.log(`${'='.repeat(50)}\n`);

    return NextResponse.json(result);
  } catch (err) {
    console.error('❌ Search Error:', err);
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack available');
    return NextResponse.json(
      { error: 'Search failed', details: err instanceof Error ? err instanceof Error ? err.message : String(err) : 'Unknown error' },
      { status: 500 }
    );
  }
}