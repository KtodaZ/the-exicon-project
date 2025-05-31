import { LexiconListItem } from '@/lib/api/lexicon';
import { LexiconTextRenderer } from '@/components/ui/lexicon-text-renderer';
import { Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/router';

interface LexiconCardProps {
  item: LexiconListItem;
  onCopyDefinition?: (title: string, description: string) => void;
}

export function LexiconCard({ item, onCopyDefinition }: LexiconCardProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if the click is on a link, button, or interactive element
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.tagName === 'SPAN' || 
        target.closest('a') || target.closest('button') || target.closest('.lexicon-interactive')) {
      return;
    }
    router.push(`/lexicon/${item.urlSlug}`);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const textToCopy = `${item.title}: ${item.description}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      onCopyDefinition?.(item.title, item.description);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Get the first letter for visual styling
  const firstLetter = item.title.charAt(0).toUpperCase();

  // Truncate description to 300 characters
  const truncatedDescription = item.description.length > 300 
    ? item.description.substring(0, 300) + '...'
    : item.description;

  return (
    <div 
      className="lexicon-card group relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-red hover:shadow-lg transition-all duration-200 p-5 cursor-pointer w-full h-fit"
      onClick={handleCardClick}
    >
      {/* First Letter Badge */}
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-red text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
        {firstLetter}
      </div>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 text-gray-400 hover:text-brand-red transition-colors duration-200 opacity-0 group-hover:opacity-100"
        title="Copy definition"
      >
        {copied ? (
          <span className="text-xs text-green-600 font-medium">Copied!</span>
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 pr-8 leading-tight break-words">
        {item.title}
      </h3>

      {/* Aliases */}
      {item.aliases && item.aliases.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 pr-8 italic">
          AKA: {item.aliases.map(alias => alias.name).join(', ')}
        </p>
      )}

      {/* Description - natural height */}
      <div className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm break-words lexicon-interactive">
        <LexiconTextRenderer 
          text={truncatedDescription} 
          showTooltips={true}
        />
      </div>
    </div>
  );
}

export default LexiconCard; 