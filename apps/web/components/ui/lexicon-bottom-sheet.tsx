import { useState, useEffect } from 'react';
import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';

interface LexiconItem {
  _id: string;
  title: string;
  description: string;
  urlSlug: string;
}

interface LexiconBottomSheetProps {
  slug: string;
  children: React.ReactNode;
  className?: string;
}

export function LexiconBottomSheet({ slug, children, className }: LexiconBottomSheetProps) {
  const [lexicon, setLexicon] = useState<LexiconItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch lexicon data when sheet opens
  useEffect(() => {
    if (isOpen && !lexicon && !loading && !error) {
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
  }, [isOpen, slug, lexicon, loading, error]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
  };

  return (
    <>
      <span
        className={`underline hover:text-[#AD0C02] transition-colors cursor-pointer ${className}`}
        onClick={handleTriggerClick}
      >
        {children}
      </span>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={lexicon?.title}
      >
        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Could not load lexicon term preview
            </p>
            <Link href={`/lexicon/${slug}`}>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                View Lexicon Page
              </Button>
            </Link>
          </div>
        ) : lexicon ? (
          <div className="pb-6">
            {/* Term type badge */}
            <div className="px-6 pb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <BookOpen className="h-4 w-4 mr-2" />
                F3 Term
              </span>
            </div>

            {/* Description */}
            <div className="px-6 mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Definition</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {lexicon.description}
              </p>
            </div>

            {/* Action Button */}
            <div className="px-6">
              <Link href={`/lexicon/${slug}`}>
                <Button className="w-full" onClick={() => setIsOpen(false)}>
                  View Full Term
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}