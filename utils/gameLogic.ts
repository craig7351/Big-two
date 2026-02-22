import { Card, HandType, PlayedHand, Rank, Suit } from '../types';

// Constants
export const SUITS = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades];
export const RANKS = [
  Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven, Rank.Eight,
  Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace, Rank.Two
];

// Helper: Get absolute value of a card (0 to 51)
// Formula: Rank * 4 + Suit. 
// 3 of Clubs = 0 * 4 + 0 = 0.
// 2 of Spades = 12 * 4 + 3 = 51.
export const getCardValue = (card: Card): number => {
  return card.rank * 4 + card.suit;
};

// Helper: Sort cards by Big Two value
export const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => getCardValue(a) - getCardValue(b));
};

// Generate a full deck
export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  let idCounter = 0;
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit, id: `card-${idCounter++}` });
    }
  }
  return deck;
};

// Shuffle deck
export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Analyze hand type
export const getHandType = (cards: Card[]): { type: HandType; value: number } => {
  const sorted = sortCards(cards);
  const len = sorted.length;

  // Single
  if (len === 1) {
    return { type: HandType.Single, value: getCardValue(sorted[0]) };
  }

  // Pair
  if (len === 2) {
    if (sorted[0].rank === sorted[1].rank) {
      // Value is the higher suit of the pair
      return { type: HandType.Pair, value: getCardValue(sorted[1]) };
    }
    return { type: HandType.Invalid, value: -1 };
  }

  // 5 Card Hands
  if (len === 5) {
    const isFlush = sorted.every(c => c.suit === sorted[0].suit);
    const ranks = sorted.map(c => c.rank);
    
    // Check Straight
    // Ranks are sorted by ID: 3(0)..A(11), 2(12)
    let isStraight = false;
    let straightValue = 0;

    // 1. Check Normal Straight (consecutive ranks)
    // e.g. 3-4-5-6-7 (0,1,2,3,4) or 10-J-Q-K-A (7,8,9,10,11)
    let isNormalStraight = true;
    for (let i = 0; i < 4; i++) {
        if (ranks[i+1] !== ranks[i] + 1) {
            isNormalStraight = false;
            break;
        }
    }
    
    if (isNormalStraight) {
        isStraight = true;
        straightValue = getCardValue(sorted[4]); // Largest card determines value
    } else {
        // 2. Check 2-3-4-5-6 (Biggest)
        // Ranks: 3(0), 4(1), 5(2), 6(3), 2(12) -> Sorted: 0,1,2,3,12
        const isBigTwoStraight = 
            ranks[0] === Rank.Three && 
            ranks[1] === Rank.Four && 
            ranks[2] === Rank.Five && 
            ranks[3] === Rank.Six && 
            ranks[4] === Rank.Two;

        if (isBigTwoStraight) {
            isStraight = true;
            // Value > Any normal straight or A-2-3-4-5.
            // Compare by the 2 (sorted[4]). Add 1000 offset.
            straightValue = 1000 + getCardValue(sorted[4]); 
        } else {
            // 3. Check A-2-3-4-5 (2nd Biggest)
            // Ranks: 3(0), 4(1), 5(2), A(11), 2(12) -> Sorted: 0,1,2,11,12
            const isAceTwoStraight = 
                ranks[0] === Rank.Three && 
                ranks[1] === Rank.Four && 
                ranks[2] === Rank.Five && 
                ranks[3] === Rank.Ace && 
                ranks[4] === Rank.Two;
                
             if (isAceTwoStraight) {
                 isStraight = true;
                 // Value > Normal but < 2-3-4-5-6.
                 // Compare by the 2 (sorted[4]). Add 500 offset.
                 straightValue = 500 + getCardValue(sorted[4]);
             }
        }
    }
    
    // If it's a Straight Flush
    if (isStraight && isFlush) {
       // Logic: SF > 4K > FullHouse > Flush > Straight
       // Within SF, compare using straightValue
       return { type: HandType.StraightFlush, value: straightValue };
    }

    // Four of a kind (4 + 1)
    const counts: Record<number, number> = {};
    ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
    const fourRank = Object.keys(counts).find(r => counts[parseInt(r)] === 4);
    
    if (fourRank) {
       // Value is determined by the rank of the four cards
       const quadCard = sorted.find(c => c.rank === parseInt(fourRank) && c.suit === Suit.Spades) || sorted.find(c => c.rank === parseInt(fourRank));
       return { type: HandType.FourOfAKind, value: quadCard ? getCardValue(quadCard) : 0 };
    }

    // Full House (3 + 2)
    const threeRank = Object.keys(counts).find(r => counts[parseInt(r)] === 3);
    const twoRank = Object.keys(counts).find(r => counts[parseInt(r)] === 2);
    if (threeRank && twoRank) {
        // Value determined by the triple
        const tripleCards = sorted.filter(c => c.rank === parseInt(threeRank));
        return { type: HandType.FullHouse, value: getCardValue(tripleCards[2]) };
    }

    // Flush
    if (isFlush) {
        return { type: HandType.Flush, value: getCardValue(sorted[4]) };
    }

    // Straight
    if (isStraight) {
        return { type: HandType.Straight, value: straightValue };
    }
  }

  return { type: HandType.Invalid, value: -1 };
};

// Check if move is valid against last hand
export const isValidMove = (
  selectedCards: Card[],
  lastHand: PlayedHand | null
): boolean => {
  const currentHand = getHandType(selectedCards);

  if (currentHand.type === HandType.Invalid) return false;

  // If new round (lastHand is null), any valid hand is okay
  if (!lastHand) return true;

  // --- Bomb Logic Start ---
  const isBomb = (type: HandType) => type === HandType.StraightFlush || type === HandType.FourOfAKind;
  const currentIsBomb = isBomb(currentHand.type);
  const lastIsBomb = isBomb(lastHand.type);

  if (currentIsBomb) {
    // Bomb beats any non-bomb hand regardless of cards count
    if (!lastIsBomb) return true;

    // Compare Bombs: SF > 4K
    const bombRank = { [HandType.FourOfAKind]: 1, [HandType.StraightFlush]: 2 };
    if (bombRank[currentHand.type] > bombRank[lastHand.type]) return true;
    if (bombRank[currentHand.type] < bombRank[lastHand.type]) return false;
    
    // Same bomb type, compare value
    return currentHand.value > lastHand.maxCardValue;
  }
  
  // If current is NOT a bomb, but last WAS a bomb, you cannot play (must pass or play bigger bomb)
  if (lastIsBomb) return false;
  // --- Bomb Logic End ---

  // Standard Rules: Must have same number of cards
  if (selectedCards.length !== lastHand.cards.length) return false;

  // Hierarchy for 5 card hands: Straight < Flush < Full House < Four of a Kind < Straight Flush
  // (Note: Bombs are handled above, so here we mostly deal with Straight, Flush, Full House)
  const handHierarchy = {
      [HandType.Straight]: 1,
      [HandType.Flush]: 2,
      [HandType.FullHouse]: 3,
      [HandType.FourOfAKind]: 4,
      [HandType.StraightFlush]: 5
  };

  if (selectedCards.length === 5) {
      const currentRank = handHierarchy[currentHand.type] || 0;
      const lastRank = handHierarchy[lastHand.type] || 0;

      if (currentRank > lastRank) return true;
      if (currentRank < lastRank) return false;
      
      // Same type, compare values
      return currentHand.value > lastHand.maxCardValue;
  }

  // Singles, Pairs
  if (currentHand.type !== lastHand.type) return false;
  return currentHand.value > lastHand.maxCardValue;
};

// Basic AI Logic
export const findBestMove = (hand: Card[], lastHand: PlayedHand | null): Card[] | null => {
    // Very greedy AI: Play the lowest cards that win
    const possibleHands: Card[][] = [];
    const sortedHand = sortCards(hand);
    
    // 1. Find all singles
    for (const card of sortedHand) {
        possibleHands.push([card]);
    }
    
    // 2. Find all pairs
    for (let i = 0; i < sortedHand.length - 1; i++) {
        if (sortedHand[i].rank === sortedHand[i+1].rank) {
            possibleHands.push([sortedHand[i], sortedHand[i+1]]);
        }
    }
    
    // 3. Find 5-card hands (Simplified logic)
    // We want AI to be able to play simple hands.
    
    // Filter for validity
    const validMoves = possibleHands.filter(move => isValidMove(move, lastHand));
    
    if (validMoves.length > 0) {
        // Pick the lowest value move (greedy) to save high cards
        validMoves.sort((a, b) => {
             const valA = getHandType(a).value;
             const valB = getHandType(b).value;
             return valA - valB;
        });
        return validMoves[0];
    }

    return null; // Pass
};