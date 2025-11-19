import fetch from 'node-fetch';

async function fetchRarities() {
  try {
    // Try fetching rarities directly
    console.log('Fetching rarities from https://api.tcgdex.net/v2/en/rarities');
    const response = await fetch('https://api.tcgdex.net/v2/en/rarities');
    
    if (response.ok) {
      const rarities = await response.json();
      console.log('Rarities found:', rarities);
      return;
    } else {
        console.log('Endpoint /rarities not found or failed. Status:', response.status);
    }

    // Fallback: Fetch a bunch of cards and extract rarities
    console.log('Fetching cards to extract rarities...');
    // Fetching cards from a few sets might be safer to get a variety
    const setsResponse = await fetch('https://api.tcgdex.net/v2/en/sets');
    if (!setsResponse.ok) {
        console.error('Failed to fetch sets');
        return;
    }
    const sets = await setsResponse.json();
    
    // Pick a few random sets to get diverse rarities
    const randomSets = sets.slice(0, 10); // Just take first 10 for now
    
    const allRarities = new Set();

    for (const set of randomSets) {
        console.log(`Fetching cards for set: ${set.name} (${set.id})`);
        const cardsResponse = await fetch(`https://api.tcgdex.net/v2/en/sets/${set.id}`);
        if(cardsResponse.ok) {
            const setDetails = await cardsResponse.json();
            const cards = setDetails.cards;
            for(const card of cards) {
                if(card.rarity) {
                    allRarities.add(card.rarity);
                }
            }
        }
    }

    console.log('Extracted Rarities:', Array.from(allRarities).sort());

  } catch (error) {
    console.error('Error:', error);
  }
}

fetchRarities();
