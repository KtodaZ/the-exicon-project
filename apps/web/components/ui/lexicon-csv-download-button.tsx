import { useState, useRef, useEffect } from 'react';
import { Button } from './button';

interface LexiconCSVDownloadButtonProps {
  searchQuery?: string;
  hasFiltersApplied: boolean;
  className?: string;
}

export default function LexiconCSVDownloadButton({
  searchQuery = '',
  hasFiltersApplied,
  className = ''
}: LexiconCSVDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState<'filtered' | 'all' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const downloadCSV = async (type: 'filtered' | 'all') => {
    setIsDownloading(type);
    
    try {
      const params = new URLSearchParams();
      
      if (type === 'filtered' && searchQuery) {
        params.append('query', searchQuery);
      }
      
      params.append('type', type);

      const response = await fetch(`/api/lexicon/download-csv?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get filename from response headers or create default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `f3-lexicon-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error downloading CSV:', error);
      // TODO: Show toast error message
    } finally {
      setIsDownloading(null);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDownloading !== null}
        className="h-8 px-2"
      >
        {isDownloading ? (
          <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          <div className="py-1">
            {hasFiltersApplied && (
              <button
                onClick={() => downloadCSV('filtered')}
                disabled={isDownloading !== null}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col">
                  <span className="font-medium">Download Search Results</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Export filtered terms
                  </span>
                </div>
              </button>
            )}
            <button
              onClick={() => downloadCSV('all')}
              disabled={isDownloading !== null}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col">
                <span className="font-medium">Download All Terms</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Export complete lexicon
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}