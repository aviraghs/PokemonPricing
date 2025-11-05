# Suicune API Query Issue - Root Cause Analysis

## Problem
The JustTCG API query for Suicune in Crown Zenith was returning blank results:
```
https://api.justtcg.com/v1/cards?q=Suicune&game=pokemon&set=crown-zenith-pokemon
```

## Root Cause
The card is in the **Crown Zenith Galarian Gallery** subset, not the main Crown Zenith set.

**Incorrect set ID**: `crown-zenith-pokemon`
**Correct set ID**: `crown-zenith-galarian-gallery-pokemon`

## Evidence
The working website URL confirms this:
```
https://explore.justtcg.com/Pokemon/crown-zenith-galarian-gallery-pokemon/pokemon-crown-zenith-galarian-gallery-suicune-v-ultra-rare
```

## Solution
Use the correct set ID when querying the API:
```
https://api.justtcg.com/v1/cards?q=Suicune&game=pokemon&set=crown-zenith-galarian-gallery-pokemon
```

## Why This Happened
Crown Zenith has multiple subsets:
1. **Crown Zenith** (main set) - `crown-zenith-pokemon`
2. **Crown Zenith Galarian Gallery** - `crown-zenith-galarian-gallery-pokemon`
3. Possibly other subsets

The Suicune V (Ultra Rare) is specifically in the Galarian Gallery subset, which is why it doesn't appear when querying the main set.

## How to Fix in Code
When searching for cards from Crown Zenith Galarian Gallery subset, the code needs to:

1. **Check multiple Crown Zenith subsets** when the main set returns no results
2. **Update the set mapping logic** in `server.js` to handle Crown Zenith subsets properly
3. **Add set name variations** to the `getJustTCGSetIdByName()` function:

```javascript
async function getJustTCGSetIdByName(setName) {
  // ... existing code ...

  // Handle Crown Zenith special case
  if (setName.toLowerCase().includes('crown zenith')) {
    // Try exact match first
    let set = justTcgSetsCache.find(s =>
      s.name && s.name.toLowerCase() === setName.toLowerCase()
    );
    if (set) return set.id;

    // Try all Crown Zenith subsets if no exact match
    const crownZenithSets = justTcgSetsCache.filter(s =>
      s.name && s.name.toLowerCase().includes('crown zenith')
    );

    // Search in all subsets
    for (const subset of crownZenithSets) {
      // Try searching in this subset
      // (implementation would need to test each subset)
    }
  }

  // ... rest of existing code ...
}
```

## Testing the Fix
To verify the fix works, test with:
- **Card**: Suicune V
- **Set**: Crown Zenith Galarian Gallery
- **Expected**: Should return price data for Suicune V Ultra Rare

## Related Files
- `server.js` - Contains `getJustTCGSetIdByName()` and `findCardOnJustTCG()` functions
- Lines 731-807 in `server.js`
