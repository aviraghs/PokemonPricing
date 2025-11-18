import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface CardListing {
  _id?: ObjectId;
  cardId: string;
  cardName: string;
  cardSet?: string;
  productType: 'cards' | 'sealed';
  sellerName: string;
  sellerEmail?: string;
  sellerContact: string;
  price: number;
  currency: string;
  condition: string;
  description: string;
  imageUrl?: string;
  imageData?: string; // base64 encoded image
  status: 'active' | 'sold' | 'removed';
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/listings
 * Fetch all active listings or filter by cardId/cardName
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    const cardName = searchParams.get('cardName');
    const productType = searchParams.get('productType');
    const status = searchParams.get('status') || 'active';

    const { listingsCollection } = await getDatabase();

    // Build query
    const query: any = { status };

    if (cardId) {
      query.cardId = cardId;
    }

    if (cardName) {
      // Case-insensitive search by card name
      query.cardName = { $regex: new RegExp(cardName, 'i') };
    }

    if (productType) {
      query.productType = productType;
    }

    // Fetch listings sorted by newest first
    const listings = await listingsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json(
      { listings, count: listings.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err) {
    console.error('❌ Error fetching listings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/listings
 * Create a new card listing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cardId,
      cardName,
      cardSet,
      productType = 'cards',
      sellerName,
      sellerEmail,
      sellerContact,
      price,
      currency = 'INR',
      condition,
      description,
      imageUrl,
      imageData,
    } = body;

    // Validation
    if (!cardName || !cardName.trim()) {
      return NextResponse.json(
        { error: 'Card name is required' },
        { status: 400 }
      );
    }

    if (!sellerName || !sellerName.trim()) {
      return NextResponse.json(
        { error: 'Seller name is required' },
        { status: 400 }
      );
    }

    if (!sellerContact || !sellerContact.trim()) {
      return NextResponse.json(
        { error: 'Contact information is required' },
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      );
    }

    if (!condition) {
      return NextResponse.json(
        { error: 'Card condition is required' },
        { status: 400 }
      );
    }

    // Validate image size if provided (max 500KB for base64)
    if (imageData && imageData.length > 500000) {
      return NextResponse.json(
        { error: 'Image size too large. Please use an image under 500KB' },
        { status: 400 }
      );
    }

    const { listingsCollection } = await getDatabase();

    const listing: Omit<CardListing, '_id'> = {
      cardId: cardId?.trim() || cardName.toLowerCase().replace(/\s+/g, '-'),
      cardName: cardName.trim(),
      cardSet: cardSet?.trim(),
      productType,
      sellerName: sellerName.trim(),
      sellerEmail: sellerEmail?.trim(),
      sellerContact: sellerContact.trim(),
      price: parseFloat(price),
      currency,
      condition,
      description: description?.trim() || '',
      imageUrl,
      imageData,
      status: 'active',
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await listingsCollection.insertOne(listing);

    console.log(`✅ Created listing: ${result.insertedId} for ${cardName}`);

    return NextResponse.json(
      {
        success: true,
        listingId: result.insertedId,
        listing: { ...listing, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('❌ Error creating listing:', err);
    return NextResponse.json(
      {
        error: 'Failed to create listing',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/listings?id=<listingId>
 * Remove a listing (soft delete - marks as removed)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('id');

    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      );
    }

    const { listingsCollection } = await getDatabase();

    // Soft delete - mark as removed instead of actually deleting
    const result = await listingsCollection.updateOne(
      { _id: new ObjectId(listingId) },
      {
        $set: {
          status: 'removed',
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Removed listing: ${listingId}`);

    return NextResponse.json({
      success: true,
      message: 'Listing removed successfully',
    });
  } catch (err) {
    console.error('❌ Error removing listing:', err);
    return NextResponse.json(
      { error: 'Failed to remove listing' },
      { status: 500 }
    );
  }
}
