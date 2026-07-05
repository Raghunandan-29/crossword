import React from 'react';

function CrosswordPreview({ grid, words = [], size = 'medium' }) {
  if (!grid || grid.length === 0) return null;

  const cellSize = size === 'small' ? 'w-6 h-6 text-[7px]' : size === 'large' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  const numSize = size === 'small' ? 'text-[5px]' : size === 'large' ? 'text-[10px]' : 'text-[7px]';

  // Build number map
  const numberMap = {};
  words.forEach(w => {
    const key = `${w.row},${w.col}`;
    if (!numberMap[key]) {
      numberMap[key] = w.number;
    }
  });

  return (
    <div className="inline-block bg-gray-900 p-0.5 rounded-lg shadow-lg">
      {grid.map((row, ri) => (
        <div key={ri} className="flex">
          {row.map((cell, ci) => {
            const isBlock = cell === '#' || cell === '.';
            const num = numberMap[`${ri},${ci}`];
            return (
              <div
                key={ci}
                className={`${cellSize} relative border border-gray-300 flex items-center justify-center font-bold uppercase select-none ${
                  isBlock ? 'bg-gray-900 border-gray-800' : 'bg-white'
                }`}
                style={{ margin: '0.5px' }}
              >
                {!isBlock && num && (
                  <span className={`absolute top-0 left-0.5 ${numSize} font-medium text-gray-400 leading-none`}>
                    {num}
                  </span>
                )}
                {!isBlock && cell && cell !== '' && (
                  <span className="text-primary-700">{cell}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default CrosswordPreview;
