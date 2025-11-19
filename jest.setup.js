// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Next.js Web APIs
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill Web APIs for Next.js
if (typeof Request === 'undefined') {
  global.Request = class Request {};
}
if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || '';
      this._headers = new global.Headers(init.headers);
      this._cookieMap = new Map();

      // Create headers property that includes cookies
      const headersInstance = this._headers;
      const cookieMap = this._cookieMap;
      Object.defineProperty(this, 'headers', {
        get() {
          return new Proxy(headersInstance, {
            get(target, prop) {
              if (prop === 'get') {
                return function(name) {
                  if (name.toLowerCase() === 'set-cookie' && cookieMap.size > 0) {
                    return Array.from(cookieMap.values()).join(', ');
                  }
                  return target.get(name);
                };
              }
              return target[prop];
            }
          });
        }
      });

      const self = this;
      // Create cookies property
      Object.defineProperty(this, 'cookies', {
        get() {
          return {
            set(name, value, options = {}) {
              let cookie = `${name}=${value}`;
              if (options.httpOnly) cookie += '; HttpOnly';
              if (options.secure) cookie += '; Secure';
              if (options.sameSite) {
                const sameSite = options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);
                cookie += `; SameSite=${sameSite}`;
              }
              if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
              if (options.path) cookie += `; Path=${options.path}`;
              self._cookieMap.set(name, cookie);
            },
            get(name) {
              return self._cookieMap.get(name);
            }
          };
        }
      });
    }

    static json(data, init = {}) {
      const body = JSON.stringify(data);
      const response = new Response(body, init);
      response._headers.set('content-type', 'application/json');
      return response;
    }

    async json() {
      return JSON.parse(this.body);
    }

    async text() {
      return this.body;
    }
  };
}
if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }
    get(name) {
      return this.headers.get(name.toLowerCase()) || null;
    }
    set(name, value) {
      this.headers.set(name.toLowerCase(), value);
    }
    has(name) {
      return this.headers.has(name.toLowerCase());
    }
    append(name, value) {
      const current = this.headers.get(name.toLowerCase());
      this.headers.set(name.toLowerCase(), current ? `${current}, ${value}` : value);
    }
  };
}

// Mock environment variables for tests
process.env.MONGO_URI = 'mongodb://localhost:27017/pokemon_cards_test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-min-32-chars';
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

// Mock fetch globally
global.fetch = jest.fn();

// Mock mongodb to prevent ESM issues with bson
jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
  ObjectId: jest.fn((id) => id),
}));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
