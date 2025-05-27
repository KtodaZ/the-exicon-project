import React from 'react';
import Image from 'next/image';
import { getTagImageFromTags, getBestTag } from '../../types/workout-tags';

interface ExercisePlaceholderProps {
  title: string;
  tags?: string[];
  className?: string;
}

export function ExercisePlaceholder({ title, tags = [], className }: ExercisePlaceholderProps) {
  const displayTag = getBestTag(tags);
  const tagImageSrc = getTagImageFromTags(tags);

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
      <div className="absolute inset-0 flex items-center p-4 pt-8">
        <h3 
          className="font-anton italic text-white text-left leading-tight line-clamp-3 pr-cou4 w-[65%]"
          style={{
            fontSize: 'clamp(1rem, 2rem, 2.5rem)', 
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)',
            wordBreak: 'break-word',
            hyphens: 'auto'
          }}
        >
          {title.toUpperCase()}
        </h3>
      </div>

      {/* Tag image overlay - right half */}
      <div className="absolute inset-0 flex items-center justify-end p-4">
        <div className="w-[35%] h-full flex items-center justify-center">
          <div className="relative w-full h-full opacity-80">
            <Image
              src={tagImageSrc}
              alt={`${displayTag} exercise category`}
              fill
              sizes="(max-width: 768px) 35vw, (max-width: 1200px) 17vw, 12vw"
              className="object-contain drop-shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 