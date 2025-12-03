import React from 'react';
import { Player } from '../types';
import { IconUser } from './Icons';

interface PlayerCardProps {
  player: Player;
  variant?: 'small' | 'full';
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, variant = 'full' }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="relative h-32 bg-cricket-light flex items-center justify-center">
        {player.photoData ? (
          <img src={player.photoData} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <div className="text-cricket-green opacity-50">
            <IconUser />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-gray-800 truncate">{player.name}</h3>
        {variant === 'full' && (
          <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
            <div>
              <span className="block font-semibold">{player.runs}</span> Runs
            </div>
            <div>
              <span className="block font-semibold">{player.wickets}</span> Wkts
            </div>
            <div>
              <span className="block font-semibold">{player.matches}</span> Mat
            </div>
            <div>
              <span className="block font-semibold">{(player.runs / (player.matches || 1)).toFixed(1)}</span> Avg
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
