import React from 'react';

interface AvatarProps {
    url: string;
    name: string;
    isActive: boolean;
    cardCount: number;
    isPass: boolean;
    isWinner?: boolean;
    money: number;
    lastScoreChange?: number;
}

const Avatar: React.FC<AvatarProps> = ({ url, name, isActive, cardCount, isPass, isWinner, money, lastScoreChange }) => {
    return (
        <div className={`flex flex-col items-center gap-2 relative transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-80'}`}>
            <div className={`relative rounded-full p-1 ${isActive ? 'bg-yellow-400 animate-pulse' : 'bg-transparent'}`}>
                <img 
                    src={url} 
                    alt={name} 
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-stone-800"
                />
                 {isWinner && (
                    <div className="absolute -top-4 -right-2 text-3xl animate-bounce">👑</div>
                )}
                {isPass && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">過</span>
                    </div>
                )}
            </div>
            <div className="text-center flex flex-col items-center">
                <div className={`font-bold text-sm ${isActive ? 'text-yellow-400' : 'text-stone-300'}`}>{name}</div>
                <div className="text-xs text-stone-400">剩 {cardCount} 張</div>
                <div className="text-xs font-mono text-yellow-500 bg-black/40 px-2 py-0.5 rounded mt-1">
                    ${money}
                </div>
                
                {/* Floating Score Change Animation */}
                {lastScoreChange !== undefined && lastScoreChange !== 0 && (
                    <div className={`absolute top-full mt-1 font-bold text-sm animate-bounce ${lastScoreChange > 0 ? 'text-green-400' : 'text-red-500'}`}>
                        {lastScoreChange > 0 ? '+' : ''}{lastScoreChange}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Avatar;