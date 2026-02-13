### /Users/ryan/Projects/oopsie-poopsie/./README.md

````markdown
1: This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app).
2:
3: ## Getting Started
4:
5: First, run the development server:
6:
7: `bash
8: npm run dev
9: # or
10: yarn dev
11: `
12:
13: Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
14:
15: You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.
16:
17: ## Learn More
18:
19: To learn more about Next.js, take a look at the following resources:
20:
21: - [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
22: - [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
23:
24: You can check out [the Next.js GitHub repository](https://github.com/zeit/next.js/) - your feedback and contributions are welcome!
25:
26: ## Deploy on ZEIT Now
27:
28: The easiest way to deploy your Next.js app is to use the [ZEIT Now Platform](https://zeit.co/import?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
29:
30: Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
````

# Oopsie Poopsie - Integration Tests

This project includes integration tests using Jest and Firebase Functions Test SDK to ensure proper functionality with the Firebase Emulator Suite.

## Testing Setup

### Prerequisites

- Node.js installed
- Firebase CLI installed
- Yarn package manager

### Running Tests

To run all tests:

```bash
yarn test
```

To run tests in watch mode:

```bash
yarn test:watch
```

To generate test coverage:

```bash
yarn test:coverage
```

## Firebase Emulator Integration

The tests are designed to work with Firebase Emulator Suite. To use:

1. Start Firebase Emulators:

```bash
firebase emulators:start
```

2. Run tests in a separate terminal:

```bash
yarn test
```

## Test Structure

- `__tests__/index.test.js` - Tests for the homepage
- `__tests__/functions.test.js` - Tests for Firebase functions
- `__tests__/setup.js` - Test setup and cleanup
- `__tests__/firebase-mock.js` - Firebase mock utilities

## Firebase Functions Test

The `firebase-functions-test` library provides:

- Mock Firebase functions environment
- Emulator support for integration testing
- Proper cleanup of test resources
- Testing of database operations and functions

## Adding New Tests

To add new tests:

1. Create a new test file in `__tests__/` directory
2. Follow the existing test patterns
3. Use appropriate mocks for external dependencies
4. Run `yarn test` to verify new tests work

## Test Coverage

Tests currently cover:

- Main page rendering
- Firebase function existence and structure
- Basic component functionality

To improve coverage:

- Add tests for user interactions
- Add tests for Firebase database operations
- Add tests for API endpoints
- Add tests for edge cases and error handling
