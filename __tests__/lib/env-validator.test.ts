import { validateEnv } from '@/lib/env-validator';

describe('Environment Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should pass validation when all required variables are set', () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
    process.env.NODE_ENV = 'test';

    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw error when MONGO_URI is missing', () => {
    delete process.env.MONGO_URI;
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
    process.env.NODE_ENV = 'test';

    expect(() => validateEnv()).toThrow('Missing required environment variables');
    expect(() => validateEnv()).toThrow('MONGO_URI');
  });

  it('should throw error when JWT_SECRET is missing', () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'test';

    expect(() => validateEnv()).toThrow('Missing required environment variables');
    expect(() => validateEnv()).toThrow('JWT_SECRET');
  });

  it('should throw error when multiple required variables are missing', () => {
    delete process.env.MONGO_URI;
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow('Missing required environment variables');
  });

  it('should warn when JWT_SECRET is too short', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'short'; // Less than 32 characters
    process.env.NODE_ENV = 'test';

    validateEnv();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET is too short')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should warn when NEXT_PUBLIC_BASE_URL is invalid', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_BASE_URL = 'not-a-valid-url';

    validateEnv();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('NEXT_PUBLIC_BASE_URL is not a valid URL')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should accept valid NEXT_PUBLIC_BASE_URL', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

    validateEnv();

    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('NEXT_PUBLIC_BASE_URL is not a valid URL')
    );

    consoleWarnSpy.mockRestore();
  });
});
