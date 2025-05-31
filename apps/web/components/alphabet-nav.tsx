import { useState, useEffect } from 'react';

interface AlphabetNavProps {
  availableLetters: string[];
  activeLetter?: string;
  onLetterClick: (letter: string) => void;
  onShowAll: () => void;
  className?: string;
}

export function AlphabetNav({ 
  availableLetters, 
  activeLetter, 
  onLetterClick, 
  onShowAll,
  className = '' 
}: AlphabetNavProps) {
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
  
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {/* Show All Button */}
        <button
          onClick={onShowAll}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            !activeLetter
              ? 'bg-brand-red text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-red'
          }`}
        >
          All
        </button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
        
        {/* Letter Buttons */}
        {allLetters.map((letter) => {
          const isAvailable = availableLetters.includes(letter);
          const isActive = activeLetter === letter;
          
          return (
            <button
              key={letter}
              onClick={() => isAvailable && onLetterClick(letter)}
              disabled={!isAvailable}
              className={`w-8 h-8 text-sm font-medium rounded-md transition-colors duration-200 ${
                isActive
                  ? 'bg-brand-red text-white'
                  : isAvailable
                  ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-red'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              title={isAvailable ? `Jump to ${letter}` : `No terms starting with ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
      
      {/* Count indicator - only show when a specific letter is active */}
      {activeLetter && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          {`Showing terms starting with "${activeLetter}"`}
        </div>
      )}
    </div>
  );
}

export default AlphabetNav; 