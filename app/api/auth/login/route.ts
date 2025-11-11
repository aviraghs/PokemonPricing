import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDatabase } from '@/lib/mongodb';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const { usersCollection } = await getDatabase();

    // Find user
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    console.log(`✅ User logged in: ${username}`);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error('❌ Login error:', err);
    return NextResponse.json(
      { error: 'Login failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
