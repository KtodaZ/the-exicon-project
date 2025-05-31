import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { useTooltipPosition } from '../../hooks/use-tooltip-position';

interface LexiconItem {
  _id: string;
  title: string;
  description: string;
  urlSlug: string;
}

interface LexiconTooltipProps {
  slug: string;
  children: React.ReactNode;
  className?: string;
}

export function LexiconTooltip({ slug, children, className }: LexiconTooltipProps) {
  const [lexicon, setLexicon] = useState<LexiconItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const { 
    triggerRef, 
    tooltipRef, 
    getTooltipClasses, 
    getArrowClasses 
  } = useTooltipPosition({ 
    isVisible: showTooltip 
  });

  // Track Shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle mouse leave - only hide if Shift is not pressed
  const handleMouseLeave = () => {
    if (!isShiftPressed) {
      setShowTooltip(false);
    }
  };

  // Fetch lexicon data when tooltip is shown
  useEffect(() => {
    if (showTooltip && !lexicon && !loading && !error) {
      setLoading(true);

      fetch(`/api/lexicon/by-slug/${slug}?preview=true`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch lexicon term');
          }
          return response.json();
        })
        .then(data => {
          if (data.success && data.lexicon) {
            setLexicon(data.lexicon);
          } else {
            setError(true);
          }
        })
        .catch(() => {
          setError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [showTooltip, slug, lexicon, loading, error]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => {
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        handleMouseLeave();
      }}
    >
      <span className="underline hover:text-[#AD0C02] transition-colors cursor-pointer">
        {children}
      </span>

      {showTooltip && (
        <div 
          ref={tooltipRef}
          className={getTooltipClasses()}
          style={{ position: 'absolute' }}
        >
          {/* Arrow */}
          <div className={getArrowClasses()}></div>

          {loading ? (
            <div className="p-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Could not load lexicon term preview
              </p>
            </div>
          ) : lexicon ? (
            <>
              {/* Content Section - Title First */}
              <div className="px-4 pt-4 pb-0 not-prose">
                {/* Title */}
                <h3 className="font-barlow text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-2">
                  {lexicon.title}
                </h3>

                {/* Term type badge */}
                <div className="mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <BookOpen className="h-3 w-3 mr-1" />
                    F3 Term
                  </span>
                </div>
              </div>

              {/* Bottom Content */}
              <div className="px-4 pb-4">
                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 leading-relaxed">
                  {lexicon.description}
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}