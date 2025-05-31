import React, { useMemo } from 'react';

interface LexiconGridProps {
  children: React.ReactNode[];
  className?: string;
  itemsPerChunk?: number;
}

export function LexiconGrid({ 
  children, 
  className = '',
  itemsPerChunk = 12 // Items per chunk for better left-to-right flow
}: LexiconGridProps) {
  
  // Split items into chunks for better alphabetical flow
  const chunks = useMemo(() => {
    const result = [];
    for (let i = 0; i < children.length; i += itemsPerChunk) {
      result.push(children.slice(i, i + itemsPerChunk));
    }
    return result;
  }, [children, itemsPerChunk]);

  return (
    <div className={className}>
      {chunks.map((chunk, chunkIndex) => (
        <div 
          key={chunkIndex}
          className="mb-6"
          style={{
            columnCount: 'auto',
            columnWidth: '280px',
            columnGap: '24px',
            columnFill: 'balance'
          }}
        >
          {chunk.map((child, index) => (
            <div 
              key={`${chunkIndex}-${index}`}
              className="break-inside-avoid mb-6 w-full"
              style={{ pageBreakInside: 'avoid' }}
            >
              {child}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default LexiconGrid; 