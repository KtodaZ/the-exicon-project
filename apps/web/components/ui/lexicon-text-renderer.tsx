import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LexiconTooltip } from './lexicon-tooltip';
import { LexiconBottomSheet } from './lexicon-bottom-sheet';

interface LexiconTextRendererProps {
  text: string;
  className?: string;
  showTooltips?: boolean;
}

export function LexiconTextRenderer({ text, className, showTooltips = true }: LexiconTextRendererProps) {
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

  // Parse the text and render lexicon references as clickable links with tooltips
  const renderTextWithReferences = (content: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Create a combined regex that matches both lexicon references and URLs
    // Lexicon references: [Term Name](@term-slug)
    // URLs: http(s)://... or www....
    const combinedRegex = /(\[([^\]]+)\]\(@([^)]+)\))|(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
      const [fullMatch, lexiconRef, lexiconName, slug, httpUrl, wwwUrl] = match;
      const startIndex = match.index;

      // Add text before this match
      if (startIndex > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, startIndex)}
          </span>
        );
      }

      if (lexiconRef) {
        // Handle lexicon reference
        const linkElement = (
          <Link
            href={`/lexicon/${slug}`}
            className="underline hover:text-[#AD0C02] transition-colors"
          >
            {lexiconName}
          </Link>
        );

        if (showTooltips && isClient) {
          if (isMobile) {
            // Mobile: use bottom sheet
            parts.push(
              <LexiconBottomSheet key={`bottomsheet-${startIndex}`} slug={slug}>
                {lexiconName}
              </LexiconBottomSheet>
            );
          } else {
            // Desktop: use tooltip
            parts.push(
              <LexiconTooltip key={`tooltip-${startIndex}`} slug={slug}>
                {linkElement}
              </LexiconTooltip>
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