import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for pokefetch.info image fetching with authentication
 * Handles image requests with Bearer token authorization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');
    const cardNumber = searchParams.get('cardNumber');

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

    // Fetch image from pokefetch.info with Bearer token
    const pokefetchUrl = `https://pokefetch.info/api/v1/${setId}/${cardNumber}`;

    const response = await fetch(pokefetchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pokefetchApiKey}`,
        'Accept': 'image/webp,image/png,image/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Pokefetch API error: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/webp';

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
