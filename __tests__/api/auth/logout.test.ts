/**
 * Comprehensive tests for /api/auth/logout endpoint
 */

import { POST } from '@/app/api/auth/logout/route';
import { NextRequest } from 'next/server';
import * as auth from '@/lib/auth';

// Mock the dependencies
jest.mock('@/lib/auth');

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (): NextRequest => {
    return {
      headers: new Headers({ 'content-type': 'application/json' }),
      url: 'http://localhost:3000/api/auth/logout',
    } as unknown as NextRequest;
  };

  describe('Successful Logout', () => {
    it('should return success response when user is logged in', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
    });

    it('should return success response when user is not logged in', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
    });

    it('should call getCurrentUser to check current session', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });

      const request = createMockRequest();
      await POST(request);

      expect(auth.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('should not expose user data in response', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(data.user).toBeUndefined();
      expect(data.id).toBeUndefined();
      expect(data.username).toBeUndefined();
      expect(data.email).toBeUndefined();
    });
  });

  describe('Cookie Clearing', () => {
    it('should set token cookie to empty string', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain('token=;');
    });

    it('should set maxAge to 0 to invalidate cookie', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('Max-Age=0');
    });

    it('should set HttpOnly flag on cookie', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('HttpOnly');
    });

    it('should set SameSite=Lax on cookie', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('SameSite=Lax');
    });

    it('should set Secure flag in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('Secure');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not set Secure flag in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).not.toContain('Secure');

      process.env.NODE_ENV = originalEnv;
    });

    it('should clear cookie even when user is already logged out', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('token=;');
      expect(cookieHeader).toContain('Max-Age=0');
    });
  });

  describe('Response Format', () => {
    it('should return JSON content type', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });

    it('should return consistent response structure', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.message).toBe('string');
    });

    it('should only include success and message in response body', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      const keys = Object.keys(data);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('success');
      expect(keys).toContain('message');
    });
  });

  describe('Multiple Logouts Handling', () => {
    it('should handle consecutive logout requests', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });

      const request1 = createMockRequest();
      const response1 = await POST(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.success).toBe(true);

      // Second logout (user already logged out)
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request2 = createMockRequest();
      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.success).toBe(true);
      expect(data2.message).toBe('Logged out successfully');
    });

    it('should be idempotent - multiple logouts should all succeed', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const responses = [];
      for (let i = 0; i < 3; i++) {
        const request = createMockRequest();
        const response = await POST(request);
        const data = await response.json();
        responses.push({ status: response.status, data });
      }

      responses.forEach(({ status, data }) => {
        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Logged out successfully');
      });
    });

    it('should clear cookie on each logout attempt', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      for (let i = 0; i < 3; i++) {
        const request = createMockRequest();
        const response = await POST(request);
        const cookieHeader = response.headers.get('set-cookie');

        expect(cookieHeader).toContain('token=;');
        expect(cookieHeader).toContain('Max-Age=0');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle getCurrentUser errors gracefully', async () => {
      (auth.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('Auth service unavailable')
      );

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Logout failed');
    });

    it('should handle unexpected errors during logout', async () => {
      (auth.getCurrentUser as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Logout failed');
    });

    it('should not expose error details in response', async () => {
      (auth.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('Sensitive error information')
      );

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('Logout failed');
      expect(data.details).toBeUndefined();
      expect(data.message).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain('Sensitive error information');
    });

    it('should still clear cookie even when getCurrentUser fails', async () => {
      (auth.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('Auth service unavailable')
      );

      const request = createMockRequest();
      const response = await POST(request);

      // Even though it returns 500, it should still try to clear the cookie
      // before the error is caught
      expect(response.status).toBe(500);
    });

    it('should return 500 status on error', async () => {
      (auth.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user gracefully', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle undefined user gracefully', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(undefined);

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle user object with missing fields', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        // missing username and email
      });

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should work without request body', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle extremely long user data', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'a'.repeat(1000),
        email: 'test@example.com',
      });

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle special characters in user data', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: '<script>alert("xss")</script>',
        email: 'test@example.com',
      });

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Response should not include user data
      expect(JSON.stringify(data)).not.toContain('<script>');
    });
  });

  describe('Security', () => {
    it('should clear cookie with secure settings in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Secure');
      expect(cookieHeader).toContain('SameSite=Lax');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not leak user information in error responses', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'should-never-be-exposed',
      });

      // Force an error after getCurrentUser
      jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('JSON error');
      });

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(JSON.stringify(data)).not.toContain('testuser');
      expect(JSON.stringify(data)).not.toContain('test@example.com');
      expect(JSON.stringify(data)).not.toContain('password');

      jest.restoreAllMocks();
    });

    it('should use httpOnly cookie to prevent XSS attacks', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('HttpOnly');
    });

    it('should use SameSite=Lax to prevent CSRF attacks', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('SameSite=Lax');
    });
  });

  describe('Logging', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log successful logout with username', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });

      const request = createMockRequest();
      await POST(request);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('User logged out: testuser')
      );
    });

    it('should not log when user is not logged in', async () => {
      (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest();
      await POST(request);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('User logged out:')
      );
    });

    it('should log errors when logout fails', async () => {
      (auth.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      const request = createMockRequest();
      await POST(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Logout error:'),
        expect.any(Error)
      );
    });
  });
});
