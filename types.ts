export enum Suit {
  Clubs = 0,    // Lowest (Changed from 1)
  Diamonds = 1, // (Changed from 0)
  Hearts = 2,
  Spades = 3    // Highest
}

// 3=0, 4=1, ... A=11, 2=12
export enum Rank {
  Three = 0,
  Four = 1,
  Five = 2,
  Six = 3,
  Seven = 4,
  Eight = 5,
  Nine = 6,
  Ten = 7,
  Jack = 8,
  Queen = 9,
  King = 10,
  Ace = 11,
  Two = 12
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // Unique ID for React keys
}

export enum HandType {
  Single = 'Single',
  Pair = 'Pair',
  Triple = 'Triple', // Usually only valid as 3 cards in variants, but for simplicity here strictly strict rules often allow 3? We will restrict to 1, 2, 5 cards.
  Straight = 'Straight',
  Flush = 'Flush',
  FullHouse = 'FullHouse',
  FourOfAKind = 'FourOfAKind', // +1 card
  StraightFlush = 'StraightFlush',
  Invalid = 'Invalid'
}

export interface PlayedHand {
  cards: Card[];
  type: HandType;
  playerIndex: number;
  maxCardValue: number; // Calculated absolute value for comparison
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  hand: Card[];
  cardsRemaining: number;
  isPass: boolean;
  avatar: string;
  money: number;           // New: Current money
  lastScoreChange?: number; // New: Money change in the last round
  lastScoreDetail?: string; // New: Description of calculation (e.g. "5張 x 2倍")
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  lastPlayedHand: PlayedHand | null;
  consecutivePasses: number;
  winners: Player[];
  gameStarted: boolean;
  gameOver: boolean;
  messages: { sender: string; text: string }[];
}