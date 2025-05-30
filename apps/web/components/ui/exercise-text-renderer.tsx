import React from 'react';
import Link from 'next/link';
import { Badge } from './badge';
import { ExerciseTooltip } from './exercise-tooltip';

interface ExerciseTextRendererProps {
  text: string;
  className?: string;
}

export function ExerciseTextRenderer({ text, className }: ExerciseTextRendererProps) {
  // Parse the text and render exercise references as clickable links with tooltips
  const renderTextWithReferences = (content: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Match references like [Exercise Name](@exercise-slug)
    const referenceRegex = /\[([^\]]+)\]\(@([^)]+)\)/g;
    let match;

    while ((match = referenceRegex.exec(content)) !== null) {
      const [fullMatch, exerciseName, slug] = match;
      const startIndex = match.index;

      // Add text before this reference
      if (startIndex > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, startIndex)}
          </span>
        );
      }

      // Add the reference as a simple underlined link with tooltip
      parts.push(
        <ExerciseTooltip key={`tooltip-${startIndex}`} slug={slug}>
          <Link
            href={`/exicon/${slug}`}
            className="underline hover:text-[#AD0C02] transition-colors"
          >
            {exerciseName}
          </Link>
        </ExerciseTooltip>
      );

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