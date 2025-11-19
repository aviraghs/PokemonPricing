# Testing Setup Guide

This guide covers the testing infrastructure for the Pokemon Card Checker application.

## Table of Contents

1. [Testing Stack](#testing-stack)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Coverage](#test-coverage)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)

---

## Testing Stack

### Installed Dependencies

- **Jest** - Test framework
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - Custom Jest matchers for DOM assertions
- **@testing-library/user-event** - User interaction simulation
- **jest-environment-jsdom** - DOM environment for tests

### Configuration Files

- `jest.config.js` - Jest configuration
- `jest.setup.js` - Global test setup
- `__tests__/` - Test files directory

---

## Running Tests

### Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test File Patterns

Jest will automatically find and run files matching these patterns:

- `__tests__/**/*.test.{ts,tsx,js,jsx}`
- `__tests__/**/*.spec.{ts,tsx,js,jsx}`
- `**/*.test.{ts,tsx,js,jsx}`
- `**/*.spec.{ts,tsx,js,jsx}`

---

## Writing Tests

### Directory Structure

```
__tests__/
├── api/           # API route tests
│   ├── auth/
│   │   ├── register.test.ts
│   │   ├── login.test.ts
│   │   └── logout.test.ts
│   └── cards/
│       └── search.test.ts
├── components/    # Component tests
│   ├── LoadingSkeleton.test.tsx
│   └── CardImage.test.tsx
└── lib/           # Utility function tests
    ├── env-validator.test.ts
    └── mongodb.test.ts
```

### Example: Component Test

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const { user } = render(<MyComponent />);
    const button = screen.getByRole('button', { name: /click me/i });

    await user.click(button);

    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### Example: Utility Function Test

```typescript
import { myUtilityFunction } from '@/lib/utils';

describe('myUtilityFunction', () => {
  it('should return expected value', () => {
    const result = myUtilityFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(myUtilityFunction('')).toBe('default');
    expect(myUtilityFunction(null)).toThrow();
  });
});
```

### Example: API Route Test (Advanced)

```typescript
import { POST } from '@/app/api/auth/register/route';

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBeDefined();
  });
});
```

---

## Test Coverage

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Coverage report will be in:
# - Terminal: Summary table
# - HTML: coverage/lcov-report/index.html
```

### Coverage Goals

- **API Routes**: 80%+ coverage
- **Utility Functions**: 90%+ coverage
- **Components**: 70%+ coverage
- **Critical Paths**: 100% coverage

### What to Test

✅ **Do test:**
- Critical business logic
- User flows (authentication, search, collection management)
- Edge cases and error handling
- API request/response handling
- Form validation
- Conditional rendering

❌ **Don't test:**
- Third-party libraries
- Next.js internals
- Simple prop passing
- Trivial getters/setters

---

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ BAD - Testing implementation details
expect(component.state.count).toBe(5);

// ✅ GOOD - Testing user-visible behavior
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

### 2. Use Descriptive Test Names

```typescript
// ❌ BAD
it('works', () => { ... });

// ✅ GOOD
it('should display error message when email is invalid', () => { ... });
```

### 3. Follow AAA Pattern

```typescript
it('should increment counter when button is clicked', async () => {
  // Arrange
  render(<Counter initialCount={0} />);
  const button = screen.getByRole('button', { name: /increment/i });

  // Act
  await userEvent.click(button);

  // Assert
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### 4. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks();
  cleanup(); // Automatically called by @testing-library/react
});
```

### 5. Mock External Dependencies

```typescript
// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'mocked' }),
  })
) as jest.Mock;

// Mock environment variables
process.env.API_KEY = 'test-key';
```

---

## Common Patterns

### Testing Async Operations

```typescript
it('should load data from API', async () => {
  render(<DataComponent />);

  // Wait for loading to complete
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for data to appear
  const dataElement = await screen.findByText('Data loaded');
  expect(dataElement).toBeInTheDocument();
});
```

### Testing Error States

```typescript
it('should display error when fetch fails', async () => {
  global.fetch = jest.fn(() => Promise.reject('API error'));

  render(<DataComponent />);

  const errorMessage = await screen.findByText(/error/i);
  expect(errorMessage).toBeInTheDocument();
});
```

### Testing Forms

```typescript
it('should submit form with user input', async () => {
  const handleSubmit = jest.fn();
  render(<LoginForm onSubmit={handleSubmit} />);

  // Fill out form
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');

  // Submit
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  // Verify
  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  });
});
```

### Testing Conditional Rendering

```typescript
it('should show login button when not authenticated', () => {
  render(<Header isAuthenticated={false} />);
  expect(screen.getByText(/log in/i)).toBeInTheDocument();
  expect(screen.queryByText(/log out/i)).not.toBeInTheDocument();
});

it('should show logout button when authenticated', () => {
  render(<Header isAuthenticated={true} />);
  expect(screen.getByText(/log out/i)).toBeInTheDocument();
  expect(screen.queryByText(/log in/i)).not.toBeInTheDocument();
});
```

### Mocking MongoDB

For API route tests that use MongoDB:

```bash
# Install MongoDB Memory Server
npm install --save-dev mongodb-memory-server
```

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  process.env.MONGO_URI = uri;
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});
```

---

## Testing API Routes

### Setup

API routes in Next.js App Router use Request/Response objects:

```typescript
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cards/route';

describe('GET /api/cards', () => {
  it('should return cards', async () => {
    const request = new NextRequest('http://localhost:3000/api/cards');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.cards)).toBe(true);
  });
});
```

---

## Debugging Tests

### Run Single Test File

```bash
npm test -- __tests__/components/LoadingSkeleton.test.tsx
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should render"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## Next Steps

1. **Write more tests** for critical API routes
2. **Set up MongoDB Memory Server** for database testing
3. **Add E2E tests** with Playwright
4. **Configure CI/CD** to run tests automatically
5. **Set coverage thresholds** in Jest config
6. **Add visual regression testing** (optional)

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Kent C. Dodds Testing Blog](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## Questions?

If you need help with testing:

1. Check the [Jest docs](https://jestjs.io/docs/getting-started)
2. Review example tests in `__tests__/`
3. Read the [Testing Library guides](https://testing-library.com/docs/react-testing-library/intro/)
4. Ask for help in team discussions

**Remember**: Good tests save time and prevent bugs!
