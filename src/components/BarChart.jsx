import React from 'react';

export const BarChart = ({ array = [], title = '', comparingIndices = [], activeIndices = [] }) => {
  const maxValue = Math.max(...array, 10);

  return (
    <div className="flex flex-col items-center w-full max-w-xl">
      <div className="flex items-end justify-center gap-2 h-64 w-full bg-[#1e1e1e] p-4 rounded-xl border border-gray-800">
        {array.map((value, idx) => {
          const heightPercent = (value / maxValue) * 100;
          let barColor = 'bg-gray-300';

          if (comparingIndices.includes(idx)) barColor = 'bg-yellow-400';
          if (activeIndices.includes(idx)) barColor = 'bg-red-500';

          return (
            <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end">
              <div 
                className={`w-full rounded-t transition-all duration-200 ${barColor}`} 
                style={{ height: `${heightPercent}%` }}
              />
              <span className="text-xs text-gray-400 mt-2 font-mono">{value}</span>
            </div>
          );
        })}
      </div>
      {title && <h4 className="mt-4 font-semibold text-gray-200 tracking-wider uppercase">{title}</h4>}
    </div>
  );
};