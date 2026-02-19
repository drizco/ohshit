// Test fixtures for game data

export const mockGame = {
  gameId: 'TEST',
  name: 'Test Game',
  status: 'pending',
  timestamp: new Date('2024-01-01T00:00:00Z'),
  numCards: 10,
  dirty: false,
  timeLimit: 60,
  noBidPoints: false,
}

export const mockGameBidPhase = {
  ...mockGame,
  status: 'bid',
  currentRound: 'round-1',
}

export const mockGamePlayPhase = {
  ...mockGame,
  status: 'play',
  currentRound: 'round-1',
  currentTrick: 'trick-1',
}

export const mockPlayer = {
  playerId: 'player-1',
  gameId: 'TEST',
  name: 'Test Player',
  host: true,
  present: true,
  bid: null,
  score: 0,
}

export const mockPlayers = [
  {
    playerId: 'player-1',
    gameId: 'TEST',
    name: 'Alice',
    host: true,
    present: true,
    bid: null,
    score: 0,
  },
  {
    playerId: 'player-2',
    gameId: 'TEST',
    name: 'Bob',
    host: false,
    present: true,
    bid: null,
    score: 0,
  },
  {
    playerId: 'player-3',
    gameId: 'TEST',
    name: 'Charlie',
    host: false,
    present: true,
    bid: null,
    score: 0,
  },
]

export const mockHand = [
  { rank: 13, suit: 'H' }, // Ace of Hearts
  { rank: 12, suit: 'H' }, // King of Hearts
  { rank: 11, suit: 'S' }, // Queen of Spades
  { rank: 10, suit: 'D' }, // Jack of Diamonds
  { rank: 5, suit: 'C' }, // 6 of Clubs
]

export const mockRound = {
  roundId: 'round-1',
  gameId: 'TEST',
  roundNumber: 1,
  numCards: 10,
  trump: 'H',
  dealer: 'player-1',
  currentTrick: 'trick-1',
}

export const mockTrick = {
  trickId: 'trick-1',
  roundId: 'round-1',
  leadSuit: 'H',
  cards: [
    { playerId: 'player-1', card: { rank: 13, suit: 'H' } },
    { playerId: 'player-2', card: { rank: 12, suit: 'H' } },
  ],
  winner: null,
}

export const mockCards = {
  aceOfHearts: { rank: 13, suit: 'H' },
  kingOfHearts: { rank: 12, suit: 'H' },
  queenOfSpades: { rank: 11, suit: 'S' },
  jackOfDiamonds: { rank: 10, suit: 'D' },
  sixOfClubs: { rank: 5, suit: 'C' },
  twoOfHearts: { rank: 1, suit: 'H' },
  twoOfSpades: { rank: 1, suit: 'S' },
}
