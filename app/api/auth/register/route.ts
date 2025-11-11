import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDatabase } from '@/lib/mongodb';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    const { usersCollection } = await getDatabase();

    // Check if username or email already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            existingUser.username === username
              ? 'Username already taken'
              : 'Email already registered',
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    // Generate JWT token
    const token = generateToken({
      id: result.insertedId.toString(),
      username,
      email,
    });

    console.log(`✅ New user registered: ${username}`);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.insertedId.toString(),
        username,
        email,
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
    console.error('❌ Registration error:', err);
    return NextResponse.json(
      { error: 'Registration failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
