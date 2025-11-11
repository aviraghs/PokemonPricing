import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (user) {
      console.log(`✅ User logged out: ${user.username}`);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error('❌ Logout error:', err);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
