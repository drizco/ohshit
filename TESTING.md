# Testing Guide

Comprehensive testing setup for Oh Shit, covering Firebase Functions, React components, utilities, and integration tests with the Firebase emulator.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Firebase Emulator Tests](#firebase-emulator-tests)
- [Coverage](#coverage)
- [Best Practices](#best-practices)

## Quick Start

Install dependencies:

```bash
yarn install
```

Run all tests:

```bash
yarn test           # Frontend/component tests
yarn test:functions # Firebase Functions tests
yarn test:all       # All tests
```

## Test Structure

```
__tests__/
├── setup/                    # Test configuration
│   ├── jest.setup.js        # Frontend test setup
│   ├── jest.functions.setup.js  # Functions test setup
│   ├── styleMock.js         # CSS/SCSS mock
│   └── fileMock.js          # Static file mock
├── fixtures/                 # Test data
│   └── gameData.js          # Mock game state, players, cards
├── helpers/                  # Test utilities
│   ├── firebase.js          # Firebase mocking helpers
│   └── render.js            # React Testing Library wrapper
├── components/              # Component tests
│   ├── Header.test.js
│   ├── Spinner.test.js
│   └── CardRow.test.js
├── functions/               # Firebase Functions tests
│   ├── game.test.js         # Game logic tests
│   └── deck.test.js         # Deck class tests
├── utils/                   # Utility function tests
│   └── helpers.test.js
└── integration/             # Integration tests
    └── emulator.test.js     # Firebase emulator tests
```

## Running Tests

### Frontend Tests (Components & Utils)

```bash
# Run once
yarn test

# Watch mode (re-runs on file changes)
yarn test:watch

# With coverage
yarn test:coverage
```

Frontend tests use:

- **jsdom** environment (simulates browser)
- **React Testing Library** for component testing
- **@testing-library/jest-dom** for DOM assertions

### Firebase Functions Tests

```bash
# Run once
yarn test:functions

# Watch mode
yarn test:functions:watch

# With coverage
jest --config jest.functions.config.js --coverage
```

Functions tests use:

- **node** environment
- Mocked Firebase Admin SDK
- Comprehensive unit tests for game logic

### Integration Tests (Firebase Emulator)

Integration tests require the Firebase emulator to be running.

**Terminal 1 - Start emulator:**

```bash
cd functions
npm run emulator
```

**Terminal 2 - Run integration tests:**

```bash
yarn test:integration
```

Integration tests:

- Use the actual Firebase Realtime Database emulator
- Test full workflows (create game → add players → start → bid → play)
- Verify database state after operations
- Automatically skip if emulator is not running

### All Tests with Coverage

```bash
yarn test:all:coverage
```

This runs both frontend and functions tests with coverage reports.

## Writing Tests

### Component Tests

Use the custom `render` helper that wraps components with necessary providers:

```javascript
import { render, screen, fireEvent } from '../helpers/render'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />, {
      contextValue: {
        dark: true,
        mute: false,
      },
    })

    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Firebase Functions Tests

Mock the Firebase database reference:

```javascript
const { newGame } = require('../../functions/game')
const { createMockRequest, createMockResponse } = require('../helpers/firebase')

test('should create a new game', async () => {
  const req = createMockRequest({
    game: 'Test Game',
    name: 'Host',
    numCards: 10,
    bidPoints: 1,
    dirty: false,
    timeLimit: 60,
  })

  const res = createMockResponse()

  await newGame(req, res)

  expect(res.status).toHaveBeenCalledWith(200)
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      gameId: expect.any(String),
      playerId: expect.any(String),
    })
  )
})
```

### Utility Tests

Test pure functions directly:

```javascript
import { isLegal, calculateLeader } from '@/utils/helpers'

test('should allow any card when no lead suit', () => {
  const hand = [{ rank: 13, suit: 'H' }]
  const card = { rank: 5, suit: 'C' }

  expect(isLegal({ hand, card, leadSuit: null })).toBe(true)
})
```

### Integration Tests

Test against the Firebase emulator:

```javascript
const admin = require('firebase-admin')

test('should create a complete game in database', async () => {
  const db = admin.database()

  // ... perform operations ...

  // Verify database state
  const gameSnapshot = await db.ref(`games/${gameId}`).once('value')
  const game = gameSnapshot.val()

  expect(game.status).toBe('pending')
})
```

## Firebase Emulator Tests

Integration tests use the Firebase Emulator Suite for realistic testing.

### Setup

1. **Install Firebase Tools** (if not already installed):

   ```bash
   npm install -g firebase-tools
   ```

2. **Configure emulator** (already done in `firebase.json`):

   ```json
   {
     "emulators": {
       "database": { "port": 9000 },
       "functions": { "port": 5001 },
       "auth": { "port": 9099 },
       "ui": { "enabled": true, "port": 4000 }
     }
   }
   ```

3. **Start emulator**:

   ```bash
   cd functions
   npm run emulator
   ```

4. **Run integration tests**:
   ```bash
   yarn test:integration
   ```

### Emulator UI

When the emulator is running, access the UI at:

- http://localhost:4000

View:

- Database state
- Function logs
- Auth users (if testing auth)

## Coverage

### View Coverage Reports

After running tests with coverage:

```bash
# Frontend coverage
yarn test:coverage
open coverage/index.html

# Functions coverage
jest --config jest.functions.config.js --coverage
open coverage-functions/index.html
```

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
},
```

## Best Practices

### 1. Test Behavior, Not Implementation

```javascript
// ❌ Bad - tests implementation details
expect(component.state.count).toBe(1)

// ✅ Good - tests user-facing behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```

### 2. Use Descriptive Test Names

```javascript
// ❌ Bad
test('it works', () => { ... });

// ✅ Good
test('should award 10 + tricks when bid matches tricks won', () => { ... });
```

### 3. Arrange, Act, Assert

```javascript
test('should add player to game', async () => {
  // Arrange
  const req = createMockRequest({ playerName: 'Alice', gameId: 'TEST' })
  const res = createMockResponse()

  // Act
  await addPlayer(req, res)

  // Assert
  expect(res.status).toHaveBeenCalledWith(200)
})
```

### 4. Use Fixtures for Complex Data

```javascript
import { mockGame, mockPlayers, mockHand } from '../fixtures/gameData'

test('should calculate game score', () => {
  const score = calculateGameScore({
    players: mockPlayers,
    bids: { 'player-1': 3 },
    roundScore: { 'player-1': 3 },
    score: {},
    noBidPoints: false,
  })

  expect(score['player-1']).toBe(13)
})
```

### 5. Clean Up After Tests

```javascript
beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(async () => {
  // Clean up database if using emulator
  await db.ref().set(null)
})
```

### 6. Mock External Dependencies

```javascript
// Mock Firebase
jest.mock('firebase-admin')

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    query: {},
  })),
}))
```

### 7. Test Edge Cases

```javascript
test('should handle empty hand', () => {
  const sorted = deck.sortHand([])
  expect(sorted).toEqual([])
})

test('should handle single player', () => {
  const players = [{ playerId: 'only' }]
  const nextId = getNextPlayer({ playerId: 'only', players })
  expect(nextId).toBe('only')
})
```

## Troubleshooting

### Tests Fail with "Cannot find module"

Install missing dependencies:

```bash
yarn install
```

### Integration Tests Skip

Make sure the Firebase emulator is running:

```bash
cd functions
npm run emulator
```

### React Component Tests Fail

Ensure `@testing-library/jest-dom` is imported in setup:

```javascript
import '@testing-library/jest-dom'
```

### Firebase Functions Tests Fail

Check that `jest.functions.config.js` is being used:

```bash
yarn test:functions
```

## Next Steps

- Add more component tests for:
  - Players component
  - CardRow component
  - Timer component
- Add end-to-end tests with Playwright or Cypress
- Add visual regression testing with Percy or Chromatic
- Improve coverage to 80%+

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
