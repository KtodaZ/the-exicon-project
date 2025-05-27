import React from 'react';
import Image from 'next/image';

interface ExercisePlaceholderProps {
  title: string;
  className?: string;
}

export function ExercisePlaceholder({ title, className }: ExercisePlaceholderProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Background image */}
      <Image
        src="/blank.png"
        alt="Exercise placeholder background"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
        priority
      />
      
      {/* Text overlay - left half only */}
      <div className="absolute inset-0 flex items-center p-4 pt-8" style={{ width: '65%' }}>
        <h3 
          className="font-anton italic text-white text-left leading-tight line-clamp-3"
          style={{
            fontSize: 'clamp(1rem, 3vw, 3rem)', 
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)',
            wordBreak: 'break-word',
            hyphens: 'auto'
          }}
        >
          {title}
        </h3>
      </div>
    </div>
  );
} 