import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAuth, getCurrentUser } from '@/lib/auth';

// Get user's cards
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardsCollection } = await getDatabase();
    const cards = await cardsCollection.find({ userId: user.id }).toArray();

    return NextResponse.json(cards);
  } catch (err) {
    console.error('❌ Error fetching cards:', err);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

// Add card to user's collection
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { title, setId, cardNumber, language = 'en', condition } = await request.json();

    if (!title || !setId || !cardNumber || !language) {
      return NextResponse.json(
        { error: 'Title, Set ID, Card Number, and Language are required' },
        { status: 400 }
      );
    }

    const validLanguages = ['en', 'ja', 'ko', 'zh', 'fr', 'de', 'es', 'it', 'pt'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json({ error: 'Invalid language code' }, { status: 400 });
    }

    console.log('\n📝 Adding card using TCGdex:', { title, setId, cardNumber, language });

    // Validate card exists on TCGdex
    const cardUrl = `https://api.tcgdex.net/v2/${language}/sets/${setId}/${cardNumber}`;
    console.log(`🔍 Validating with TCGdex: ${cardUrl}`);

    const cardResponse = await fetch(cardUrl);
    if (!cardResponse.ok) {
      if (cardResponse.status === 404) {
        return NextResponse.json(
          {
            error: `Card not found on TCGdex with Set ID "${setId}" and Card # "${cardNumber}" in ${language}`,
          },
          { status: 404 }
        );
      }
      throw new Error(`TCGdex API error: ${cardResponse.status}`);
    }

    const cardData = await cardResponse.json();
    console.log('✅ Found on TCGdex:', cardData.name);

    const { cardsCollection } = await getDatabase();

    // Check if card already exists in user's collection
    const existingCard = await cardsCollection.findOne({
      userId: user.id,
      setId,
      cardNumber,
      language,
    });

    if (existingCard) {
      console.log('⚠️  Card already in collection:', existingCard._id);
      return NextResponse.json(
        {
          error: 'This card is already in your collection',
          cardId: existingCard._id,
        },
        { status: 409 } // 409 Conflict
      );
    }

    const card = {
      userId: user.id,
      username: user.username,
      title: cardData.name,
      setId,
      set: cardData.set.name || 'Unknown',
      cardNumber,
      language,
      rarity: cardData.rarity,
      cardId: cardData.id,
      variantId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      condition,
    };

    const result = await cardsCollection.insertOne(card);

    console.log('✅ Card added with ID:', result.insertedId);

    return NextResponse.json({
      success: true,
      data: { ...card, _id: result.insertedId },
    });
  } catch (err) {
    console.error('❌ Error adding card:', err);
    return NextResponse.json(
      {
        error: 'Failed to add card',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
