import React from 'react';
import Image from 'next/image';
import { getTagImageFromTags, getBestTag } from '@/types/workout-tags';

interface ExercisePlaceholderLargeProps {
  title: string;
  tags?: string[];
  className?: string;
}

export function ExercisePlaceholderLarge({ title, tags = [], className }: ExercisePlaceholderLargeProps) {
  const displayTag = getBestTag(tags);
  const tagImageSrc = getTagImageFromTags(tags);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Background image */}
      <Image
        src="/blank.png"
        alt="Exercise placeholder background"
        fill
        sizes="(max-width: 768px) 100vw, 800px"
        className="object-cover"
        priority
      />
      
      {/* Text overlay - left half */}
      <div className="absolute inset-0 flex items-center p-6 md:p-8">
        <h1 
          className="font-anton italic text-white text-left leading-tight line-clamp-4 pr-4 w-[60%]"
          style={{
            fontSize: 'clamp(2rem, 4rem, 6rem)', 
            textShadow: '3px 3px 12px rgba(0, 0, 0, 0.9)',
            wordBreak: 'break-word',
            hyphens: 'auto'
          }}
        >
          {title.toUpperCase()}
        </h1>
      </div>

      {/* Tag image overlay - right half */}
      <div className="absolute inset-0 flex items-center justify-end p-6 md:p-8">
        <div className="w-[40%] h-full flex items-center justify-center">
          <div className="relative w-full h-full opacity-85">
            <Image
              src={tagImageSrc}
              alt={`${displayTag} exercise category`}
              fill
              sizes="(max-width: 768px) 40vw, 320px"
              className="object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 