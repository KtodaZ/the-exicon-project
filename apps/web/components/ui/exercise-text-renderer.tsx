import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from './badge';
import { ExerciseTooltip } from './exercise-tooltip';
import { ExerciseBottomSheet } from './exercise-bottom-sheet';

interface ExerciseTextRendererProps {
  text: string;
  className?: string;
  showTooltips?: boolean;
}

export function ExerciseTextRenderer({ text, className, showTooltips = true }: ExerciseTextRendererProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Parse the text and render exercise references as clickable links with tooltips
  const renderTextWithReferences = (content: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Create a combined regex that matches both exercise references and URLs
    // Exercise references: [Exercise Name](@exercise-slug)
    // URLs: http(s)://... or www....
    const combinedRegex = /(\[([^\]]+)\]\(@([^)]+)\))|(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
      const [fullMatch, exerciseRef, exerciseName, slug, httpUrl, wwwUrl] = match;
      const startIndex = match.index;

      // Add text before this match
      if (startIndex > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, startIndex)}
          </span>
        );
      }

      if (exerciseRef) {
        // Handle exercise reference
        const linkElement = (
          <Link
            href={`/exicon/${slug}`}
            className="underline hover:text-[#AD0C02] transition-colors"
          >
            {exerciseName}
          </Link>
        );

        if (showTooltips && isClient) {
          if (isMobile) {
            // Mobile: use bottom sheet
            parts.push(
              <ExerciseBottomSheet key={`bottomsheet-${startIndex}`} slug={slug}>
                {exerciseName}
              </ExerciseBottomSheet>
            );
          } else {
            // Desktop: use tooltip
            parts.push(
              <ExerciseTooltip key={`tooltip-${startIndex}`} slug={slug}>
                {linkElement}
              </ExerciseTooltip>
            );
          }
        } else {
          // Fallback for SSR or when tooltips are disabled
          parts.push(
            <span key={`link-${startIndex}`}>
              {linkElement}
            </span>
          );
        }
      } else if (httpUrl || wwwUrl) {
        // Handle regular URL
        const url = httpUrl || wwwUrl;
        const href = httpUrl || `https://${wwwUrl}`;
        
        parts.push(
          <a
            key={`url-${startIndex}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#AD0C02] transition-colors"
          >
            {url}
          </a>
        );
      }

      lastIndex = startIndex + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className={className}>
      <span className="whitespace-pre-wrap">
        {renderTextWithReferences(text)}
      </span>
    </div>
  );
}