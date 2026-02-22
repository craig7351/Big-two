import React from 'react';
import { Card, Suit, Rank } from '../types';

interface CardProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  small?: boolean;
}

const suitSymbols = {
  [Suit.Diamonds]: '♦',
  [Suit.Clubs]: '♣',
  [Suit.Hearts]: '♥',
  [Suit.Spades]: '♠'
};

const rankSymbols = {
  [Rank.Three]: '3', [Rank.Four]: '4', [Rank.Five]: '5', [Rank.Six]: '6',
  [Rank.Seven]: '7', [Rank.Eight]: '8', [Rank.Nine]: '9', [Rank.Ten]: '10',
  [Rank.Jack]: 'J', [Rank.Queen]: 'Q', [Rank.King]: 'K', [Rank.Ace]: 'A', [Rank.Two]: '2'
};

const CardComponent: React.FC<CardProps> = ({ card, onClick, selected, disabled, hidden, small }) => {
  const isRed = card.suit === Suit.Diamonds || card.suit === Suit.Hearts;
  
  if (hidden) {
    return (
      <div 
        className={`
          ${small ? 'w-10 h-14' : 'w-20 h-28 sm:w-24 sm:h-36'} 
          bg-blue-800 border-2 border-white rounded-lg shadow-md 
          bg-opacity-90 flex items-center justify-center
          relative
        `}
      >
        <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
      </div>
    );
  }

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        ${small ? 'w-10 h-14 text-xs' : 'w-20 h-28 sm:w-24 sm:h-36 text-base'}
        bg-white rounded-lg shadow-lg border-2 
        ${selected ? 'border-yellow-400 -translate-y-4 shadow-yellow-500/50' : 'border-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2'}
        transition-all duration-200 select-none flex flex-col justify-between p-1 sm:p-2
        relative overflow-hidden
      `}
    >
      <div className={`font-bold ${isRed ? 'text-red-600' : 'text-slate-900'} leading-none`}>
        {rankSymbols[card.rank]}
      </div>
      
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-4xl ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {suitSymbols[card.suit]}
      </div>

      <div className={`font-bold ${isRed ? 'text-red-600' : 'text-slate-900'} leading-none self-end rotate-180`}>
        {rankSymbols[card.rank]}
      </div>
    </div>
  );
};

export default CardComponent;