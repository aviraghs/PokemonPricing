import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';

// Delete card from user's collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { cardsCollection } = await getDatabase();
    const { id } = await params;

    const result = await cardsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: user.id, // Only delete if card belongs to user
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Card not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting card:', err);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
