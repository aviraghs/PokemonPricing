import { NextRequest, NextResponse } from 'next/server';

// Fetch Japanese sets from Pokemon Price Tracker
async function fetchJapaneseSetsFromPPT() {
  try {
    const POKEMONPRICETRACKER_API_KEY = process.env.POKEMONPRICETRACKER_API_KEY;
    if (!POKEMONPRICETRACKER_API_KEY) {
      console.log('⚠️  POKEMONPRICETRACKER_API_KEY not configured');
      return null;
    }

    console.log('🇯🇵 Fetching Japanese sets from Pokemon Price Tracker...');

    const response = await fetch('https://www.pokemonpricetracker.com/api/v2/sets?language=japanese', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POKEMONPRICETRACKER_API_KEY}`,
      }
    });

    if (!response.ok) {
      console.log(`⚠️  Pokemon Price Tracker sets API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.data?.length || data.length || 0} Japanese sets from Pokemon Price Tracker`);

    return data.data || data;
  } catch (err) {
    console.error('❌ Error fetching Japanese sets from Pokemon Price Tracker:', (err as Error).message);
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
    console.error('❌ Failed to get JustTCG set ID:', (err as Error).message);
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
    console.error('❌ Error finding related subsets:', (err as Error).message);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ language: string; setId: string }> }
) {
  try {
    const { language, setId } = await params;
    const validLanguages = ['en', 'ja', 'ko', 'zh', 'fr', 'de', 'es', 'it', 'pt'];

    if (!validLanguages.includes(language)) {
      return NextResponse.json({ error: 'Invalid language code' }, { status: 400 });
    }

    // For Japanese sets, use Pokemon Price Tracker
    if (language === 'ja') {
      console.log(`🇯🇵 Fetching Japanese set details for ${setId} from Pokemon Price Tracker...`);

      const POKEMONPRICETRACKER_API_KEY = process.env.POKEMONPRICETRACKER_API_KEY;
      if (!POKEMONPRICETRACKER_API_KEY) {
        console.log('⚠️  POKEMONPRICETRACKER_API_KEY not configured, falling back to TCGdex');
      } else {
        try {
          // First, get the set info from the sets endpoint
          const setsResponse = await fetch(`https://www.pokemonpricetracker.com/api/v2/sets?language=japanese`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${POKEMONPRICETRACKER_API_KEY}`,
            }
          });

          if (setsResponse.ok) {
            const setsData = await setsResponse.json();
            const sets = setsData.data || setsData;

            console.log(`   📊 Sample set from Pokemon Price Tracker:`, sets[0] ? Object.keys(sets[0]) : 'No sets');
            console.log(`   Looking for setId: ${setId}`);

            // Find the specific set by ID - try multiple fields
            // The setId coming from the homepage should be tcgPlayerId (e.g., 'm2-inferno-x')
            const setInfo = sets.find((s: any) =>
              s.tcgPlayerId === setId ||
              s.slug === setId ||
              s.setId === setId ||
              s.id === setId ||
              s._id === setId ||
              s.name === setId
            );

            if (setInfo) {
              console.log(`   Found set: ${setInfo.name}`);
              console.log(`   Set details:`, setInfo);

              // Use tcgPlayerId for the cards API (this is the correct slug format)
              const actualSetId = setInfo.tcgPlayerId || setInfo.slug || setInfo.setId || setId;
              console.log(`   Using setId for cards API: ${actualSetId}`);

              // Now fetch cards in this set using the cards endpoint
              // Limit to 20 cards to save API credits (1 credit per card)
              const cardsUrl = `https://www.pokemonpricetracker.com/api/v2/cards?setId=${actualSetId}&limit=20&language=japanese`;
              console.log(`   Fetching cards from: ${cardsUrl} (limited to 20 cards to save credits)`);

              const cardsResponse = await fetch(cardsUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${POKEMONPRICETRACKER_API_KEY}`,
                }
              });

              console.log(`   Cards API response status: ${cardsResponse.status}`);

              if (cardsResponse.ok) {
                const cardsData = await cardsResponse.json();
                const cards = cardsData.data || cardsData;

                console.log(`   📊 Raw cards data structure:`, {
                  totalCards: cards.length,
                  firstCard: cards[0] ? Object.keys(cards[0]) : 'No cards',
                  sampleCard: cards[0]
                });

                // Transform to TCGdex-compatible format
                const transformedCards = cards.map((card: any) => {
                  let imageUrl = card.image || card.imageUrl || card.images?.small || card.images?.large || null;

                  // Only proxy product images (not set_icon images)
                  // Product images like "product/647201_in_200x200.jpg" are allowed to be hotlinked
                  // Set icon images like "set_icon/24499M2A...png" are blocked
                  if (imageUrl && imageUrl.includes('tcgplayer-cdn.tcgplayer.com') && imageUrl.includes('/product/')) {
                    // imageUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
                  } else if (imageUrl && imageUrl.includes('tcgplayer-cdn.tcgplayer.com')) {
                    // Don't proxy set_icon or other blocked images - will fallback to placeholder
                    console.log(`   ⚠️  Skipping blocked image type: ${imageUrl}`);
                    imageUrl = null;
                  }

                  const transformed = {
                    id: card.id || card.cardId || `${setId}-${card.number || card.cardNumber}`,
                    localId: card.number || card.cardNumber || card.localId || '???',
                    name: card.name || 'Unknown Card',
                    image: imageUrl,
                    rarity: card.rarity || 'Common',
                    types: card.types || [],
                    tcgplayer: card.prices ? {
                      prices: {
                        normal: {
                          market: card.prices.market || card.prices.marketPrice || null
                        }
                      }
                    } : null
                  };
                  return transformed;
                });

                // Don't use tcgplayer-cdn set_icon URLs (they're blocked)
                // Try to get logo from TCGdex instead
                let setLogoUrl = null;
                try {
                  const tcgdexResponse = await fetch(`https://api.tcgdex.net/v2/ja/sets`);
                  if (tcgdexResponse.ok) {
                    const tcgdexSets = await tcgdexResponse.json();
                    const tcgdexMatch = tcgdexSets.find((s: any) =>
                      s.name === setInfo.name ||
                      s.id === actualSetId ||
                      s.name.toLowerCase().includes(setInfo.name.toLowerCase())
                    );
                    if (tcgdexMatch && tcgdexMatch.logo) {
                      setLogoUrl = tcgdexMatch.logo;
                      console.log(`   ✅ Using TCGdex logo for set: ${setLogoUrl}`);
                    }
                  }
                } catch (err) {
                  console.log(`   ⚠️  Could not fetch TCGdex logo: ${(err as Error).message}`);
                }

                const transformedSet = {
                  id: setInfo.tcgPlayerId || setInfo.slug || setInfo.setId || setId,
                  name: setInfo.name,
                  logo: setLogoUrl,
                  symbol: setInfo.symbol || null,
                  cardCount: {
                    total: setInfo.cardCount || setInfo.total || setInfo.numberOfCards || 0,
                    showing: transformedCards.length // Show how many cards we're actually displaying (limited to 20)
                  },
                  releaseDate: setInfo.releaseDate || setInfo.release_date || setInfo.releasedAt || null,
                  englishName: setInfo.englishName || setInfo.english_name || null,
                  serie: setInfo.series ? { name: setInfo.series } : { name: 'N/A' },
                  cards: transformedCards
                };

                console.log(`✅ Fetched Japanese set from Pokemon Price Tracker: ${transformedSet.name} (${transformedSet.cards.length} cards)`);
                console.log(`   First transformed card:`, transformedSet.cards[0]);
                return NextResponse.json(transformedSet);
              } else {
                const errorText = await cardsResponse.text();
                console.log(`⚠️  Cards endpoint returned ${cardsResponse.status}`);
                console.log(`   Error details: ${errorText}`);
                if (cardsResponse.status === 429) {
                  console.log(`   ⚠️  RATE LIMIT HIT - Pokemon Price Tracker API rate limit exceeded`);
                  console.log(`   Consider waiting a few minutes before trying again, or use TCGdex fallback`);
                }
                console.log(`   Falling back to TCGdex...`);
              }
            } else {
              console.log(`⚠️  Set ${setId} not found in Pokemon Price Tracker, falling back to TCGdex`);
            }
          } else {
            console.log(`⚠️  Pokemon Price Tracker sets endpoint returned ${setsResponse.status}, falling back to TCGdex`);
          }
        } catch (err) {
          console.error('❌ Error fetching from Pokemon Price Tracker:', (err as Error).message);
          console.log('⚠️  Falling back to TCGdex');
        }
      }
    }

    // For all other languages (or Japanese fallback), use TCGdex
    console.log(`🌐 Fetching ${language} set details for ${setId} from TCGdex...`);
    const url = `https://api.tcgdex.net/v2/${language}/sets/${setId}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.log(`⚠️ Set ${setId} not found in ${language}, status: ${response.status}`);
      return NextResponse.json(
        { error: `Set not found: ${setId}` },
        { status: response.status }
      );
    }

    const setData = await response.json();

    // For non-English sets, try to fetch English translation
    if (language !== 'en') {
      try {
        console.log(`   Fetching English translation for ${setId}...`);
        const enResponse = await fetch(`https://api.tcgdex.net/v2/en/sets/${setId}`);
        if (enResponse.ok) {
          const englishSetData = await enResponse.json();
          setData.englishName = englishSetData.name;
          console.log(`   ✅ English translation: ${englishSetData.name}`);
        }
      } catch (err) {
        console.warn('   Could not fetch English translation:', err);
      }
    }

    // If TCGdex doesn't have a logo, try to fetch from pokefetch
    if (!setData.logo) {
      try {
        const POKEFETCH_API_KEY = process.env.POKEFETCH_API_KEY;
        if (POKEFETCH_API_KEY) {
          // Try multiple set name variations for pokefetch
          const setNameVariations = [
            // Full set name as-is (pokefetch expects spaces)
            setData.name,
            // Full set name, title case
            setData.name.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
            // First word only
            setData.name.split(' ')[0],
          ];

          console.log(`   Attempting to fetch logo from pokefetch with variations:`, setNameVariations);

          for (const pokefetchSetParam of setNameVariations) {
            try {
              // Use 'pikachu' as a common query to get any card from the set and extract the logo
              const pokefetchUrl = `https://pokefetch.info/pokemon?query=pikachu&limit=1&set=${encodeURIComponent(pokefetchSetParam)}`;
              const pokefetchResponse = await fetch(pokefetchUrl, {
                headers: {
                  'Authorization': `Bearer ${POKEFETCH_API_KEY}`,
                }
              });

              if (pokefetchResponse.ok) {
                const pokefetchData = await pokefetchResponse.json();
                if (pokefetchData.data && pokefetchData.data.length > 0) {
                  const card = pokefetchData.data[0];
                  if (card.set && card.set.logo_url) {
                    setData.logo = card.set.logo_url;
                    console.log(`   ✅ Using pokefetch logo for set (variation: ${pokefetchSetParam}): ${setData.logo}`);
                    break; // Found a logo, stop trying variations
                  }
                }
              }
            } catch (err) {
              console.log(`   ⚠️  Variation ${pokefetchSetParam} failed: ${(err as Error).message}`);
            }
          }
        }
      } catch (err) {
        console.log(`   ⚠️  Could not fetch logo from pokefetch: ${(err as Error).message}`);
      }
    }

    console.log(`✅ Fetched set from TCGdex: ${setData.name} (${setData.cardCount?.total || setData.cards?.length || 0} cards)`);
    return NextResponse.json(setData);

  } catch (err) {
    console.error('❌ Error fetching set details:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch set details',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
