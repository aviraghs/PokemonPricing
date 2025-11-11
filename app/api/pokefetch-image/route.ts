import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for pokefetch.info image fetching with authentication
 * Uses the pokefetch.info search API to find cards and retrieve their images
 * pokefetch.info API: https://pokefetch.info/pokemon?query={setId}-{cardNumber}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');
    const cardNumber = searchParams.get('cardNumber');
    const cardName = searchParams.get('cardName');
    const setName = searchParams.get('setName');

    // Validate parameters
    if (!setId || !cardNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters: setId and cardNumber' },
        { status: 400 }
      );
    }

    const pokefetchApiKey = process.env.POKEFETCH_API_KEY;
    if (!pokefetchApiKey) {
      console.error('POKEFETCH_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Image service configuration error' },
        { status: 500 }
      );
    }

    // Extract first word from set name and clean it for pokefetch API
    // "Macdonald's Collection 2018" -> "mcdonald"
    let pokefetchSetParam = setId;
    if (setName) {
      const firstWord = setName.split(' ')[0]; // Get first word: "Macdonald's"
      pokefetchSetParam = firstWord
        .replace(/['']s$/, '') // Remove possessive 's: "Macdonald"
        .toLowerCase(); // Convert to lowercase: "macdonald"
    }

    // Search for card in pokefetch.info using card name/number and set
    // Format: https://pokefetch.info/pokemon?query={cardName}&limit=10&set={setParam}
    const searchUrl = `https://pokefetch.info/pokemon?query=${encodeURIComponent(cardName || cardNumber)}&limit=10&set=${encodeURIComponent(pokefetchSetParam)}`;

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pokefetchApiKey}`,
      },
    });

    if (!searchResponse.ok) {
      console.error(`Pokefetch search failed: ${searchResponse.status}`);
      return NextResponse.json(
        { error: `Pokefetch search error: ${searchResponse.status}` },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();

    // Check if card was found
    if (!searchData.data || searchData.data.length === 0) {
      return NextResponse.json(
        { error: 'Card not found in pokefetch.info' },
        { status: 404 }
      );
    }

    // Find card by matching card number if multiple results
    let card = searchData.data[0];
    if (searchData.data.length > 1 && cardNumber) {
      const matchedCard = searchData.data.find((c: any) => {
        const num = c.cardNumber || c.number || c.id || '';
        return num.toString() === cardNumber.toString();
      });
      if (matchedCard) {
        card = matchedCard;
      }
    }
    const imageUrl = card.images?.large || card.images?.small;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image available for this card' },
        { status: 404 }
      );
    }

    // Fetch the actual image from the URL provided by pokefetch.info
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      console.error(`Failed to fetch image from ${imageUrl}: ${imageResponse.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: imageResponse.status }
      );
    }

    // Get the image data
    const imageData = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // Return image with proper headers
    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000', // Cache for 30 days
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Pokefetch image fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image from pokefetch.info' },
      { status: 500 }
    );
  }
}
