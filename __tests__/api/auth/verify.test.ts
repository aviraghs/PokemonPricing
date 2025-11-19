/**
 * Comprehensive tests for /api/auth/verify endpoint
 */

import { GET } from '@/app/api/auth/verify/route';
import { NextRequest, NextResponse } from 'next/server';
import * as auth from '@/lib/auth';
import jwt from 'jsonwebtoken';

// Mock NextResponse to avoid Response.cookies conflict
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: jest.fn((data, init) => {
        const response = {
          json: async () => data,
          status: init?.status || 200,
          headers: new Map([['content-type', 'application/json']]),
        };
        response.headers.get = (name) => {
          if (name === 'content-type') return 'application/json';
          return null;
        };
        return response;
      }),
    },
  };
});

// Mock the dependencies
jest.mock('@/lib/auth');
jest.mock('jsonwebtoken');
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('GET /api/auth/verify', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (): NextRequest => {
    return {
      headers: new Headers(),
      url: 'http://localhost:3000/api/auth/verify',
    } as unknown as NextRequest;
  };

  describe('Missing Token (No Cookie)', () => {
    it('should return not authenticated when token cookie is missing', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: false,
        authenticated: false,
        user: null,
      });
    });

    it('should call getCurrentUser to check authentication', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      await GET(request);

      expect(auth.getCurrentUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Invalid Token Format', () => {
    it('should return not authenticated when getCurrentUser returns null due to invalid token', async () => {
      // getCurrentUser internally calls verifyToken which returns null for invalid tokens
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.authenticated).toBe(false);
      expect(data.user).toBeNull();
    });

    it('should handle malformed JWT tokens gracefully', async () => {
      // Simulate getCurrentUser returning null due to malformed token
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(false);
    });
  });

  describe('Expired Token', () => {
    it('should return not authenticated when token is expired', async () => {
      // getCurrentUser returns null when token verification fails (including expiration)
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: false,
        authenticated: false,
        user: null,
      });
    });

    it('should handle TokenExpiredError gracefully', async () => {
      // getCurrentUser catches and handles expired tokens by returning null
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(false);
      expect(data.user).toBeNull();
    });
  });

  describe('Valid Token with User Data', () => {
    it('should return authenticated user when token is valid', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        authenticated: true,
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        },
      });
    });

    it('should return only safe user data (no password)', async () => {
      const userWithPassword = {
        ...mockUser,
        password: 'hashed_password_should_not_be_returned',
      };

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(userWithPassword);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      });
      expect(data.user).not.toHaveProperty('password');
    });

    it('should include all required user fields', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('username');
      expect(data.user).toHaveProperty('email');
      expect(data.user.id).toBe('user-123');
      expect(data.user.username).toBe('testuser');
      expect(data.user.email).toBe('test@example.com');
    });
  });

  describe('Token Verification with JWT', () => {
    it('should rely on getCurrentUser for JWT verification', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createMockRequest();
      await GET(request);

      // Verify that getCurrentUser is called which handles JWT verification internally
      expect(auth.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle valid JWT with correct payload structure', async () => {
      const validUser = {
        id: 'abc-123',
        username: 'validuser',
        email: 'valid@example.com',
      };

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(validUser);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.user).toMatchObject(validUser);
    });

    it('should handle JWT verification failure', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.authenticated).toBe(false);
      expect(data.user).toBeNull();
    });
  });

  describe('Response Format', () => {
    it('should return correct response format when authenticated', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('authenticated');
      expect(data).toHaveProperty('user');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.authenticated).toBe('boolean');
      expect(typeof data.user).toBe('object');
    });

    it('should return correct response format when not authenticated', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('authenticated');
      expect(data).toHaveProperty('user');
      expect(data.success).toBe(false);
      expect(data.authenticated).toBe(false);
      expect(data.user).toBeNull();
    });

    it('should always return 200 status for valid requests (even when not authenticated)', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createMockRequest();
      const response = await GET(request);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });
  });

  describe('Error Handling', () => {
    it('should handle getCurrentUser throwing an error', async () => {
      (auth.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Authentication service error'));

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Verification failed');
    });

    it('should handle unexpected errors during verification', async () => {
      (auth.getCurrentUser as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Verification failed');
    });

    it('should handle null/undefined errors gracefully', async () => {
      (auth.getCurrentUser as jest.Mock).mockRejectedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Verification failed');
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test verification error');

      (auth.getCurrentUser as jest.Mock).mockRejectedValue(testError);

      const request = createMockRequest();
      await GET(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Verify error:', testError);

      consoleErrorSpy.mockRestore();
    });

    it('should not expose internal error details to client', async () => {
      (auth.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('Internal database connection string: mongodb://secret')
      );

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.error).toBe('Verification failed');
      expect(data.error).not.toContain('mongodb://');
      expect(data.error).not.toContain('database');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user object with additional fields', async () => {
      const userWithExtraFields = {
        ...mockUser,
        role: 'admin',
        createdAt: new Date().toISOString(),
        preferences: { theme: 'dark' },
      };

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(userWithExtraFields);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      // Should only return id, username, email
      expect(data.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      });
      expect(data.user).not.toHaveProperty('role');
      expect(data.user).not.toHaveProperty('createdAt');
      expect(data.user).not.toHaveProperty('preferences');
    });

    it('should handle empty string user id', async () => {
      const userWithEmptyId = {
        id: '',
        username: 'testuser',
        email: 'test@example.com',
      };

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(userWithEmptyId);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.authenticated).toBe(true);
      expect(data.user.id).toBe('');
    });

    it('should handle special characters in username and email', async () => {
      const userWithSpecialChars = {
        id: 'user-123',
        username: 'test_user-123',
        email: 'test+tag@example.co.uk',
      };

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(userWithSpecialChars);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.user.username).toBe('test_user-123');
      expect(data.user.email).toBe('test+tag@example.co.uk');
    });

    it('should handle unicode characters in user data', async () => {
      const userWithUnicode = {
        id: 'user-123',
        username: 'user测试',
        email: 'test@例え.com',
      };

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(userWithUnicode);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.user.username).toBe('user测试');
      expect(data.user.email).toBe('test@例え.com');
    });

    it('should handle very long user IDs', async () => {
      const userWithLongId = {
        id: 'a'.repeat(1000),
        username: 'testuser',
        email: 'test@example.com',
      };

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(userWithLongId);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.user.id).toBe('a'.repeat(1000));
    });
  });

  describe('Multiple Verification Requests', () => {
    it('should handle consecutive verification requests independently', async () => {
      // First request - authenticated
      (auth.getCurrentUser as jest.Mock).mockResolvedValueOnce(mockUser);
      const request1 = createMockRequest();
      const response1 = await GET(request1);
      const data1 = await response1.json();

      expect(data1.authenticated).toBe(true);

      // Second request - not authenticated
      (auth.getCurrentUser as jest.Mock).mockResolvedValueOnce(null);
      const request2 = createMockRequest();
      const response2 = await GET(request2);
      const data2 = await response2.json();

      expect(data2.authenticated).toBe(false);
    });

    it('should call getCurrentUser for each verification request', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      await GET(createMockRequest());
      await GET(createMockRequest());
      await GET(createMockRequest());

      expect(auth.getCurrentUser).toHaveBeenCalledTimes(3);
    });
  });

  describe('Success and Authenticated Flags', () => {
    it('should set success=true and authenticated=true for valid user', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.authenticated).toBe(true);
    });

    it('should set success=false and authenticated=false when no user', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.authenticated).toBe(false);
    });

    it('should ensure success and authenticated flags are always boolean', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(typeof data.success).toBe('boolean');
      expect(typeof data.authenticated).toBe('boolean');
    });
  });
});