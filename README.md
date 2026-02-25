# Oh Shit

A real-time multiplayer trick-taking card game. Players bid on the number of tricks they'll win each round, and score points based on accuracy. Live at [ohshit.cards](https://ohshit.cards).

## Tech Stack

- **Frontend:** Next.js 14 (Pages Router), React 18, TypeScript, SCSS modules, Bootstrap/Reactstrap
- **Backend:** Firebase Cloud Functions (Node 20) with Express
- **Database:** Firebase Realtime Database
- **Testing:** Jest, React Testing Library, Playwright E2E, Firebase Functions Test SDK
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel (frontend), Firebase (functions)

## Local Development

### Prerequisites

- Node 20 (via nvm)
- Yarn (via Corepack)

### Setup

```bash
# Install root dependencies
yarn install

# Install functions dependencies
cd functions && yarn install && cd ..
```

### Running the app

```bash
# Start the frontend dev server (localhost:3000)
yarn dev

# In a separate terminal, start the Firebase Emulator Suite (localhost:4000 for UI)
cd functions && yarn emulator
```

The emulator starts:

- Auth on port 9099
- Realtime Database on port 9000
- Functions on port 5001
- Emulator UI on port 4000

## Commands

### Frontend (root directory)

```bash
yarn dev              # Dev server on localhost:3000
yarn build            # Production build
yarn start            # Start production server
yarn lint             # ESLint
yarn lint:fix         # ESLint with auto-fix
yarn type-check       # TypeScript type check
```

### Testing

```bash
yarn test                   # Frontend unit tests
yarn test:watch             # Frontend tests in watch mode
yarn test:coverage          # Frontend tests with coverage report
yarn test:functions         # Firebase Functions unit tests
yarn test:functions:watch   # Functions tests in watch mode
yarn test:integration       # Integration tests (requires running emulator)
yarn test:all               # All tests (frontend + functions)
yarn test:e2e               # Playwright E2E tests (requires running emulator)
yarn test:e2e:ui            # Playwright with interactive UI
yarn test:e2e:report        # View last Playwright report
```

### Firebase Functions (functions/ directory)

```bash
cd functions
yarn build            # Compile TypeScript
yarn build:watch      # Compile TypeScript in watch mode
yarn dev              # TypeScript watch + emulator (concurrent)
yarn serve            # Functions emulator only
yarn deploy           # Deploy functions to Firebase
yarn lint             # ESLint
yarn type-check       # TypeScript type check
```

## Architecture

### Data model

Game state lives in Firebase Realtime Database under a single `/games/{gameId}` node:

```
/games/{gameId}/
  metadata/        — game name, timestamp, gameId
  settings/        — numCards, timeLimit, dirty, noBidPoints
  state/           — status, currentPlayerIndex, playerOrder, roundId, dealerIndex, …
  players/{id}/    — name, playerId, present, score, hands/{roundId}/cards/{cardId}
  rounds/{id}/     — trump, bids/{playerId}, tricks/{id}/cards + leader + winner
```

### Game states

`pending` → `bid` → `play` → _(next round)_ → `over`

### API endpoints

All functions are deployed as a single Express app. Endpoints are POST unless noted.

| Endpoint                                        | Description                        |
| ----------------------------------------------- | ---------------------------------- |
| `POST /new-game`                                | Create a new game                  |
| `POST /add-player`                              | Add a player to a game             |
| `POST /start-game`                              | Start the game (pending → bid)     |
| `POST /submit-bid`                              | Submit a bid for the current round |
| `POST /play-card`                               | Play a card                        |
| `POST /replay-game`                             | Restart the game                   |
| `PUT /update-player/:playerId/:gameId/:present` | Update player presence             |

### Key source files

| Path                              | Description                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `src/pages/game/[gameId].tsx`     | Main game page                                                                  |
| `src/hooks/`                      | Custom hooks for game state, Firebase listeners, actions                        |
| `src/utils/helpers.ts`            | Core game logic: `calculateLeader()`, `isLegal()`, `calculateGameScore()`, etc. |
| `src/utils/api.ts`                | Wrappers for all API calls                                                      |
| `src/context/AppStateContext.tsx` | Global state (mute, dark mode, timer)                                           |
| `functions/game.ts`               | Server-side game logic                                                          |
| `functions/index.ts`              | Express API routing                                                             |

## Test Structure

```
__tests__/
├── components/     # Component unit tests
├── hooks/          # Hook unit tests
├── utils/          # Utility function tests
├── functions/      # Firebase Functions unit tests
├── integration/    # Integration tests (require Firebase Emulator)
├── fixtures/       # Shared test fixtures
├── helpers/        # Test helper utilities
└── setup/          # Jest setup files and mocks

e2e/                # Playwright end-to-end tests
```

Coverage thresholds are enforced at 50% for branches, functions, lines, and statements.
