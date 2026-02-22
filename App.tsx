import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, GameState, HandType, Player, PlayedHand, Rank, Suit } from './types';
import { generateDeck, shuffleDeck, sortCards, isValidMove, getHandType, findBestMove, getCardValue } from './utils/gameLogic';
import { audioManager } from './utils/audio';
import CardComponent from './components/CardComponent';
import Avatar from './components/Avatar';

const INITIAL_PLAYERS: Player[] = [
  { id: 0, name: '玩家 (你)', isHuman: true, hand: [], cardsRemaining: 0, isPass: false, avatar: 'https://picsum.photos/100/100?random=1', money: 1000 },
  { id: 1, name: '電腦小明', isHuman: false, hand: [], cardsRemaining: 0, isPass: false, avatar: 'https://picsum.photos/100/100?random=2', money: 1000 },
  { id: 2, name: '電腦小華', isHuman: false, hand: [], cardsRemaining: 0, isPass: false, avatar: 'https://picsum.photos/100/100?random=3', money: 1000 },
  { id: 3, name: '電腦小美', isHuman: false, hand: [], cardsRemaining: 0, isPass: false, avatar: 'https://picsum.photos/100/100?random=4', money: 1000 }
];

const HAND_NAMES: Record<string, string> = {
  [HandType.Single]: '單張',
  [HandType.Pair]: '對子',
  [HandType.Triple]: '三條',
  [HandType.Straight]: '順子',
  [HandType.Flush]: '同花',
  [HandType.FullHouse]: '葫蘆',
  [HandType.FourOfAKind]: '鐵支',
  [HandType.StraightFlush]: '同花順',
  [HandType.Invalid]: '不合法'
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: INITIAL_PLAYERS,
    currentPlayerIndex: 0,
    lastPlayedHand: null,
    consecutivePasses: 0,
    winners: [],
    gameStarted: false,
    gameOver: false,
    messages: []
  });

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Game
  const startNewGame = useCallback(() => {
    // Start Audio
    audioManager.startBGM();

    const deck = shuffleDeck(generateDeck());

    // Preserve money from previous round, reset other stats
    const players = gameState.players.map(p => ({
      ...p,
      hand: [],
      cardsRemaining: 0,
      isPass: false,
      lastScoreChange: undefined, // Clear visual notification
      lastScoreDetail: undefined
    }));

    // Deal 13 cards to each
    for (let i = 0; i < 52; i++) {
      players[i % 4].hand.push(deck[i]);
    }

    // Sort hands and find who has 3 of Clubs
    let starterIndex = 0;
    players.forEach((p, idx) => {
      p.hand = sortCards(p.hand);
      p.cardsRemaining = p.hand.length;
      if (p.hand.some(c => c.rank === Rank.Three && c.suit === Suit.Clubs)) {
        starterIndex = idx;
      }
    });

    setGameState({
      players,
      currentPlayerIndex: starterIndex,
      lastPlayedHand: null,
      consecutivePasses: 0,
      winners: [],
      gameStarted: true,
      gameOver: false,
      messages: [{ sender: '系統', text: '遊戲開始！由梅花 3 先出。' }]
    });
    setSelectedCardIds([]);
    setShowRules(false);
    audioManager.playWhoosh(); // Sound for dealing/starting
  }, [gameState.players]);

  // Add message to log
  const addLog = (text: string, sender: string = '系統') => {
    setGameState(prev => ({
      ...prev,
      messages: [...prev.messages, { sender, text }]
    }));
  };

  // Scroll log to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameState.messages]);

  // Handle Player Move
  const handlePlayCards = (cards: Card[]) => {
    const player = gameState.players[gameState.currentPlayerIndex];
    const handTypeData = getHandType(cards);

    if (!gameState.lastPlayedHand && gameState.messages.length <= 1) {
      // First turn constraint: Must play 3 of Clubs
      const hasThreeClubs = cards.some(c => c.rank === Rank.Three && c.suit === Suit.Clubs);
      if (!hasThreeClubs) {
        addLog("第一手必須包含梅花 3！", "裁判");
        if (player.isHuman) audioManager.playError();
        return;
      }
    }

    if (isValidMove(cards, gameState.lastPlayedHand)) {
      // Valid Move Sound
      audioManager.playWhoosh();

      // Execute Move
      const newHand = player.hand.filter(c => !cards.find(sc => sc.id === c.id));
      const playedHand: PlayedHand = {
        cards,
        type: handTypeData.type,
        playerIndex: player.id,
        maxCardValue: handTypeData.value
      };

      const newPlayers = [...gameState.players];
      newPlayers[gameState.currentPlayerIndex] = {
        ...player,
        hand: newHand,
        cardsRemaining: newHand.length,
        isPass: false // Reset pass status on play
      };

      // Check Win
      if (newHand.length === 0) {
        audioManager.playWin(); // Winner Sound

        // --- Calculate Money ---
        let totalWinnings = 0;
        const winnerId = player.id;

        const finalPlayers = newPlayers.map(p => {
          if (p.id === winnerId) {
            return p; // Update winner later
          }

          // Calculate Loss
          const remainingCards = p.hand.length;
          const twoCount = p.hand.filter(c => c.rank === Rank.Two).length;

          let penalty = remainingCards * 10; // $10 per card
          let multiplier = 1;

          // Double for each 2
          for (let i = 0; i < twoCount; i++) {
            multiplier *= 2;
          }
          penalty *= multiplier;

          totalWinnings += penalty;

          // Generate detail string
          let detail = `${remainingCards}張牌`;
          if (twoCount > 0) detail += ` + ${twoCount}張老二(x${multiplier})`;

          return {
            ...p,
            money: p.money - penalty,
            lastScoreChange: -penalty,
            lastScoreDetail: detail
          };
        });

        // Update Winner
        const winnerPlayer = finalPlayers.find(p => p.id === winnerId)!;
        winnerPlayer.money += totalWinnings;
        winnerPlayer.lastScoreChange = totalWinnings;
        winnerPlayer.lastScoreDetail = "大獲全勝";

        setGameState(prev => ({
          ...prev,
          players: finalPlayers,
          lastPlayedHand: playedHand,
          winners: [winnerPlayer],
          gameOver: true,
          messages: [...prev.messages, { sender: '系統', text: `${player.name} 獲勝！贏得 $${totalWinnings}` }]
        }));
        return;
      }

      setGameState(prev => ({
        ...prev,
        players: newPlayers,
        lastPlayedHand: playedHand,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % 4,
        consecutivePasses: 0,
        messages: [...prev.messages, { sender: player.name, text: `出了 ${HAND_NAMES[handTypeData.type] || handTypeData.type}` }]
      }));
      setSelectedCardIds([]);

    } else {
      if (player.isHuman) {
        addLog("出牌不符合規則！", "裁判");
        audioManager.playError();
      }
    }
  };

  const handlePass = () => {
    if (gameState.lastPlayedHand === null) {
      addLog("自由出牌階段不能 Pass！", "裁判");
      audioManager.playError();
      return;
    }

    // Pass Sound
    audioManager.playPass();

    const newPlayers = [...gameState.players];
    newPlayers[gameState.currentPlayerIndex].isPass = true;

    let nextPasses = gameState.consecutivePasses + 1;
    let nextLastHand = gameState.lastPlayedHand;

    // If 3 people passed, board clears
    if (nextPasses >= 3) {
      addLog("無人能擋，重新出牌！", "系統");
      nextPasses = 0;
      nextLastHand = null;
      // Clear pass status visually for next round
      newPlayers.forEach(p => p.isPass = false);
    }

    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      currentPlayerIndex: (prev.currentPlayerIndex + 1) % 4,
      consecutivePasses: nextPasses,
      lastPlayedHand: nextLastHand,
      messages: [...prev.messages, { sender: prev.players[prev.currentPlayerIndex].name, text: 'Pass' }]
    }));
  };

  const toggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  // Bot Turn Logic (Basic Heuristics, no API)
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isHuman) return;

    // Simulate thinking time
    const timer = setTimeout(() => {
      const bestMove = findBestMove(currentPlayer.hand, gameState.lastPlayedHand);

      // Logic constraints
      // If free turn (lastHand == null), must play.
      let move = bestMove;

      // Force play if start of game (3C) or free turn
      if (!gameState.lastPlayedHand && !move) {
        // Should pick lowest card
        move = [currentPlayer.hand[0]];
      }

      if (move) {
        handlePlayCards(move);
      } else {
        handlePass();
      }
    }, 1000 + Math.random() * 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameOver]);


  // Human Interactions
  const toggleCardSelection = (id: string) => {
    // Click Sound
    audioManager.playSelect();

    setSelectedCardIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleHumanPlay = () => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.isHuman) return;

    const cardsToPlay = currentPlayer.hand.filter(c => selectedCardIds.includes(c.id));
    if (cardsToPlay.length === 0) return;

    handlePlayCards(cardsToPlay);
  };

  // Render Helpers
  const renderPlayer = (playerIndex: number, positionClass: string) => {
    const player = gameState.players[playerIndex];
    const isCurrent = gameState.currentPlayerIndex === playerIndex;

    return (
      <div className={`absolute ${positionClass} flex flex-col items-center transition-opacity duration-500 ${player.isPass ? 'opacity-50' : 'opacity-100'}`}>
        <Avatar
          url={player.avatar}
          name={player.name}
          isActive={isCurrent}
          cardCount={player.cardsRemaining}
          isPass={player.isPass}
          isWinner={gameState.winners.some(w => w.id === player.id)}
          money={player.money}
          lastScoreChange={player.lastScoreChange}
        />
        {/* Opponent Cards (Face Down) */}
        {!player.isHuman && (
          <div className="flex -space-x-3 mt-2">
            {Array.from({ length: Math.min(player.cardsRemaining, 5) }).map((_, i) => (
              <CardComponent key={i} card={{ suit: Suit.Spades, rank: Rank.Ace, id: 'hidden' }} hidden small />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-green-900 flex flex-col relative overflow-hidden font-sans">

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-800 to-green-950"></div>

      {/* Rules Modal */}
      {showRules && (
        <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowRules(false)}>
          <div className="bg-stone-800 border-2 border-yellow-600 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowRules(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-yellow-500 mb-4 border-b border-stone-600 pb-2">遊戲規則</h2>
            <div className="text-stone-300 space-y-3 text-sm leading-relaxed">
              <p><strong className="text-white">基本目標：</strong> 最先將手中的13張牌出完者獲勝。</p>

              <p><strong className="text-white">金錢規則 (New)：</strong> <br />
                每人起始 $1000。<br />
                輸家賠款 = 剩餘張數 × $10。<br />
                <strong>老二懲罰：</strong> 手中每有一張老二 (2)，罰款總額乘以 2倍！<br />
                (例如：剩5張牌且有2張老二 = 5 × $10 × 2 × 2 = $200)</p>

              <p><strong className="text-white">牌面大小：</strong> <br />
                2 &gt; A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3</p>

              <p><strong className="text-white">花色大小：</strong> <br />
                ♠ 黑桃 &gt; ♥ 紅心 &gt; ♦ 方塊 &gt; ♣ 梅花</p>

              <p><strong className="text-white">發牌規則：</strong> <br />
                手中有<strong>梅花 3</strong> 的玩家先出，第一手牌必須包含梅花 3。</p>

              <div className="p-3 bg-stone-900 rounded-lg">
                <strong className="text-white block mb-1">合法牌型：</strong>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>單張、對子、三條</strong></li>
                  <li><strong>5張牌型：</strong> 同花順 &gt; 鐵支 &gt; 葫蘆 &gt; 同花 &gt; 順子</li>
                </ul>
                <div className="mt-2 text-xs text-yellow-500">
                  * 鐵支與同花順為怪物牌，可無視張數壓制。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Toggle (Top Right) */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 z-40 bg-stone-800/80 p-2 rounded-full text-white hover:bg-stone-700 transition-colors border border-stone-600"
        title={isMuted ? "開啟音效" : "靜音"}
      >
        {isMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>

      {/* Main Game Area */}
      <div className="flex-1 relative flex items-center justify-center">

        {/* Game Info Overlay */}
        {!gameState.gameStarted && (
          <div className="absolute z-50 inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-stone-800 p-8 rounded-2xl shadow-2xl text-center border border-stone-600">
              <h1 className="text-5xl font-black text-yellow-500 mb-2 tracking-tighter">大老二</h1>
              <p className="text-stone-300 mb-6">你能打敗電腦嗎？</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowRules(true)}
                  className="bg-stone-700 hover:bg-stone-600 text-white font-bold py-3 px-6 rounded-full transition-transform"
                >
                  查看規則
                </button>
                <button
                  onClick={startNewGame}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  {gameState.gameOver ? "下一局" : "開始遊戲"}
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState.gameOver && (
          <div className="absolute z-50 inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="bg-stone-800 p-6 rounded-2xl shadow-2xl text-center border border-yellow-500 w-full max-w-2xl">
              <h1 className="text-4xl font-bold text-white mb-2">遊戲結束！</h1>
              <p className="text-yellow-400 text-xl mb-6">{gameState.winners[0].name} 獲勝！</p>

              {/* Score Table */}
              <div className="bg-stone-900 rounded-lg p-4 mb-6 text-sm">
                <div className="grid grid-cols-4 gap-2 border-b border-stone-700 pb-2 mb-2 font-bold text-stone-400">
                  <div>玩家</div>
                  <div>說明</div>
                  <div>輸贏</div>
                  <div>總資產</div>
                </div>
                {gameState.players.map(p => (
                  <div key={p.id} className="grid grid-cols-4 gap-2 py-2 border-b border-stone-800 last:border-0 items-center">
                    <div className="font-bold text-white text-left pl-2">{p.name}</div>
                    <div className="text-stone-400 text-xs text-left">{p.lastScoreDetail || '-'}</div>
                    <div className={`font-bold ${p.lastScoreChange && p.lastScoreChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.lastScoreChange && p.lastScoreChange > 0 ? '+' : ''}{p.lastScoreChange || 0}
                    </div>
                    <div className="text-yellow-500 font-mono">${p.money}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={startNewGame}
                className="bg-white text-stone-900 font-bold py-3 px-8 rounded-full hover:bg-gray-200 shadow-lg hover:scale-105 transition-transform"
              >
                再玩一局
              </button>
            </div>
          </div>
        )}

        {/* Table Felt */}
        <div className="w-full max-w-5xl aspect-square sm:aspect-video relative rounded-full border-8 border-green-950/30 bg-green-800 shadow-inner flex items-center justify-center">

          {/* Center: Played Cards */}
          <div className="absolute z-10 flex flex-col items-center justify-center min-h-[160px]">
            {gameState.lastPlayedHand ? (
              <>
                <div className="flex -space-x-8 sm:-space-x-12 animate-in fade-in zoom-in duration-300">
                  {sortCards(gameState.lastPlayedHand.cards).map((card) => (
                    <CardComponent key={card.id} card={card} />
                  ))}
                </div>
                <div className="mt-4 bg-black/40 px-3 py-1 rounded-full text-white text-xs sm:text-sm font-medium backdrop-blur-sm">
                  上家: {HAND_NAMES[gameState.lastPlayedHand.type] || gameState.lastPlayedHand.type} ({gameState.players[gameState.lastPlayedHand.playerIndex].name})
                </div>
              </>
            ) : (
              gameState.gameStarted && <div className="text-green-900/40 font-bold text-2xl uppercase tracking-widest">輪到你了</div>
            )}
          </div>

          {/* Players Positioning */}
          {/* Top: Bot Beta (index 2) */}
          {gameState.gameStarted && renderPlayer(2, "top-4")}

          {/* Left: Bot Alpha (index 1) */}
          {gameState.gameStarted && renderPlayer(1, "left-4 top-1/2 -translate-y-1/2")}

          {/* Right: Bot Gamma (index 3) */}
          {gameState.gameStarted && renderPlayer(3, "right-4 top-1/2 -translate-y-1/2")}

        </div>
      </div>

      {/* Human Player Area (Bottom) */}
      <div className="h-64 sm:h-72 bg-stone-900/95 border-t border-stone-700 flex flex-col relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">

        {/* Actions Bar */}
        <div className="h-14 flex items-center justify-between px-4 sm:px-8 bg-stone-800 border-b border-stone-700">
          <div className="flex items-center gap-4">
            {/* Money Display for Human */}
            <div className="flex items-center gap-2 bg-stone-900/50 px-3 py-1 rounded-full border border-yellow-500/30 shadow-inner">
              <span className="text-yellow-500 font-bold text-sm">$</span>
              <span className="text-yellow-400 font-mono font-bold text-lg">{gameState.players[0].money}</span>
            </div>

            <span className="w-px h-6 bg-stone-600 hidden sm:block"></span>

            <span className="text-stone-400 text-sm hidden sm:block">當前回合: <span className="text-yellow-400 font-bold">{gameState.players[gameState.currentPlayerIndex].name}</span></span>
            <button
              onClick={() => setShowRules(true)}
              className="flex items-center gap-1 px-3 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs text-stone-200 transition-colors"
            >
              <span className="w-4 h-4 rounded-full bg-stone-500 flex items-center justify-center text-[10px] font-bold">?</span>
              規則
            </button>
          </div>

          {gameState.gameStarted && gameState.players[0].isHuman && (
            <div className="flex gap-3">
              <button
                onClick={handlePass}
                disabled={gameState.currentPlayerIndex !== 0 || !gameState.lastPlayedHand}
                className="px-4 py-1.5 rounded bg-stone-700 hover:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
              >
                Pass
              </button>
              <button
                onClick={handleHumanPlay}
                disabled={gameState.currentPlayerIndex !== 0 || selectedCardIds.length === 0}
                className="px-6 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                出牌
              </button>
            </div>
          )}
        </div>

        {/* Chat/Log Overlay */}
        <div className="absolute bottom-full right-4 sm:right-8 mb-4 w-64 max-h-48 overflow-y-auto bg-black/50 backdrop-blur-md rounded-lg p-3 text-xs text-stone-300 border border-stone-700 scrollbar-hide flex flex-col-reverse">
          {gameState.messages.slice().reverse().map((msg, idx) => (
            <div key={idx} className="mb-1">
              <span className={msg.sender === '系統' ? 'text-yellow-500' : 'text-blue-400 font-bold'}>{msg.sender}:</span> {msg.text}
            </div>
          ))}
        </div>

        {/* Cards Container */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-x-auto overflow-y-hidden">
          <div className="flex -space-x-8 sm:-space-x-10 hover:-space-x-6 transition-all duration-300 px-8 pt-4 pb-2">
            {gameState.players[0].hand.map((card) => (
              <CardComponent
                key={card.id}
                card={card}
                selected={selectedCardIds.includes(card.id)}
                onClick={() => toggleCardSelection(card.id)}
                disabled={gameState.currentPlayerIndex !== 0}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;