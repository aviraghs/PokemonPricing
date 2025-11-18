import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';

/**
 * Optimized endpoint to check if a card exists in user's collection
 * Much faster than fetching entire collection
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    const setId = searchParams.get('setId');
    const cardNumber = searchParams.get('cardNumber');
    const language = searchParams.get('language') || 'en';

    if (!cardId && (!setId || !cardNumber)) {
      return NextResponse.json(
        { error: 'Either cardId or (setId + cardNumber) required' },
        { status: 400 }
      );
    }

    const { cardsCollection } = await getDatabase();

    // Check by cardId or by setId/cardNumber/language combination
    const query = cardId
      ? { userId: user.id, cardId }
      : { userId: user.id, setId, cardNumber, language };

    const existingCard = await cardsCollection.findOne(query);

    return NextResponse.json(
      {
        exists: !!existingCard,
        cardId: existingCard?._id,
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache', // Don't cache since collection changes
        },
      }
    );
  } catch (err) {
    console.error('❌ Error checking card:', err);
    return NextResponse.json({ error: 'Failed to check card' }, { status: 500 });
  }
}
