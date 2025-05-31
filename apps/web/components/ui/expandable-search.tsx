import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Search, ExternalLink, X, BookOpen, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from './input';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { CombinedSearchResult } from '@/types/search';

interface ExpandableSearchProps {
    className?: string;
    placeholder?: string;
}

export function ExpandableSearch({
    className = '',
    placeholder = 'Search exercises and F3 terms...'
}: ExpandableSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CombinedSearchResult | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLexiconCollapsed, setIsLexiconCollapsed] = useState(false);
    const [isExercisesCollapsed, setIsExercisesCollapsed] = useState(false);
    const router = useRouter();

    const debouncedQuery = useDebounce(query, 300);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640); // sm breakpoint
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close when clicking outside (but not on mobile when fullscreen)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!isMobile && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                handleClose();
            }
        }

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isExpanded, isMobile]);

    // Fetch search results from combined API
    useEffect(() => {
        async function fetchResults() {
            if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
                setResults(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(`/api/search/combined?query=${encodeURIComponent(debouncedQuery)}`);
                if (response.ok) {
                    const data: CombinedSearchResult = await response.json();
                    setResults(data);
                } else {
                    setResults(null);
                }
            } catch (error) {
                console.error('Search error:', error);
                setResults(null);
            }
            setIsLoading(false);
        }

        fetchResults();
    }, [debouncedQuery]);

    const handleExpand = () => {
        setIsExpanded(true);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    const handleClose = () => {
        setIsExpanded(false);
        setQuery('');
        setResults(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    };

    const handleLexiconClick = (urlSlug: string) => {
        handleClose();
        router.push(`/lexicon/${urlSlug}`);
    };

    const handleExerciseClick = (slug: string) => {
        handleClose();
        router.push(`/exicon/${slug}`);
    };

    const handleSeeAllLexiconClick = () => {
        const searchQuery = query.trim();
        handleClose();
        router.push(`/lexicon?query=${encodeURIComponent(searchQuery)}`);
    };

    const handleSeeAllExercisesClick = () => {
        const searchQuery = query.trim();
        handleClose();
        router.push(`/exicon?query=${encodeURIComponent(searchQuery)}`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            // Default to lexicon search if there are lexicon results, otherwise exercises
            if (results?.lexicon.items.length) {
                handleSeeAllLexiconClick();
            } else {
                handleSeeAllExercisesClick();
            }
        }
    };

    const truncateDescription = (text: string, maxLength: number = 80) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    const hasResults = results && (results.lexicon.items.length > 0 || results.exercises.items.length > 0);

    // Mobile fullscreen overlay
    if (isMobile && isExpanded) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleClose}
                        className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                    <form onSubmit={handleSubmit} className="flex-1">
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                type="search"
                                placeholder={placeholder}
                                value={query}
                                onChange={handleInputChange}
                                className="pl-10 pr-4 h-10 w-full"
                                autoFocus
                            />
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        </div>
                    </form>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center">
                            <div className="animate-spin h-6 w-6 border-2 border-brand-red border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-gray-500">Searching...</p>
                        </div>
                    ) : hasResults ? (
                        <>
                            {/* Exercise Results - Now First */}
                            {results?.exercises.items.length > 0 && (
                                <>
                                    <button
                                        onClick={() => setIsExercisesCollapsed(!isExercisesCollapsed)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Dumbbell className="h-4 w-4 text-brand-red" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Exercises
                                            </span>
                                        </div>
                                        {isExercisesCollapsed ? (
                                            <ChevronDown className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <ChevronUp className="h-4 w-4 text-gray-500" />
                                        )}
                                    </button>
                                    {!isExercisesCollapsed && results.exercises.items.slice(0, 4).map((item: any) => (
                                        <button
                                            key={item.slug}
                                            onClick={() => handleExerciseClick(item.slug)}
                                            className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                                        {item.name}
                                                    </div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                        {truncateDescription(item.description)}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={handleSeeAllExercisesClick}
                                        className="w-full py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center font-medium text-brand-red hover:text-red-700 dark:hover:text-red-400 text-xs"
                                    >
                                        See all exercise results →
                                    </button>
                                </>
                            )}

                            {/* Lexicon Results - Now Second */}
                            {results?.lexicon.items.length > 0 && (
                                <>
                                    <button
                                        onClick={() => setIsLexiconCollapsed(!isLexiconCollapsed)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-brand-red" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                F3 Lexicon
                                            </span>
                                        </div>
                                        {isLexiconCollapsed ? (
                                            <ChevronDown className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <ChevronUp className="h-4 w-4 text-gray-500" />
                                        )}
                                    </button>
                                    {!isLexiconCollapsed && results.lexicon.items.slice(0, 4).map((item: any) => (
                                        <button
                                            key={item.urlSlug}
                                            onClick={() => handleLexiconClick(item.urlSlug)}
                                            className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                                        {item.title}
                                                    </div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                        {truncateDescription(item.description)}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={handleSeeAllLexiconClick}
                                        className="w-full py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center font-medium text-brand-red hover:text-red-700 dark:hover:text-red-400 text-xs"
                                    >
                                        See all lexicon results →
                                    </button>
                                </>
                            )}
                        </>
                    ) : query.trim().length >= 2 ? (
                        <div className="p-4 text-center text-gray-500">
                            No results found for &quot;{query}&quot;
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-500">
                            Start typing to search exercises...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Desktop version
    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {!isExpanded ? (
                // Collapsed state - just a search icon
                <button
                    onClick={handleExpand}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Search exercises"
                >
                    <Search className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
                </button>
            ) : (
                // Expanded state - full search bar
                <div className="w-80"> {/* 50px wider than the 256px (w-64) original */}
                    <form onSubmit={handleSubmit}>
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                type="search"
                                placeholder={placeholder}
                                value={query}
                                onChange={handleInputChange}
                                className="pl-10 pr-10 h-10 w-full"
                            />
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                            <button
                                type="button"
                                onClick={handleClose}
                                className="absolute right-3 top-3 h-4 w-4 text-gray-500 hover:text-gray-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </form>

                    {/* Results dropdown */}
                    {(query.trim().length >= 2 && (hasResults || isLoading)) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-[28rem] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 text-center text-gray-500">
                                    <div className="animate-spin h-4 w-4 border-2 border-brand-red border-t-transparent rounded-full mx-auto mb-2"></div>
                                    Searching...
                                </div>
                            ) : hasResults ? (
                                <>
                                    {/* Exercise Results - Now First */}
                                    {results?.exercises.items.length > 0 && (
                                        <>
                                            <button
                                                onClick={() => setIsExercisesCollapsed(!isExercisesCollapsed)}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Dumbbell className="h-3 w-3 text-brand-red" />
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        Exercises
                                                    </span>
                                                </div>
                                                {isExercisesCollapsed ? (
                                                    <ChevronDown className="h-3 w-3 text-gray-500" />
                                                ) : (
                                                    <ChevronUp className="h-3 w-3 text-gray-500" />
                                                )}
                                            </button>
                                            {!isExercisesCollapsed && results.exercises.items.slice(0, 4).map((item: any) => (
                                                <button
                                                    key={item.slug}
                                                    onClick={() => handleExerciseClick(item.slug)}
                                                    className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
                                                    style={{ height: '60px' }}
                                                >
                                                    <div className="flex items-center gap-3 h-full">
                                                        <div className="flex-1 text-left min-w-0">
                                                            <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                                                                {item.name}
                                                            </div>
                                                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                                {truncateDescription(item.description)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                            <button
                                                onClick={handleSeeAllExercisesClick}
                                                className="w-full py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center font-medium text-brand-red hover:text-red-700 dark:hover:text-red-400 text-xs"
                                            >
                                                See all exercise results →
                                            </button>
                                        </>
                                    )}

                                    {/* Lexicon Results - Now Second */}
                                    {results?.lexicon.items.length > 0 && (
                                        <>
                                            <button
                                                onClick={() => setIsLexiconCollapsed(!isLexiconCollapsed)}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-3 w-3 text-brand-red" />
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        F3 Lexicon
                                                    </span>
                                                </div>
                                                {isLexiconCollapsed ? (
                                                    <ChevronDown className="h-3 w-3 text-gray-500" />
                                                ) : (
                                                    <ChevronUp className="h-3 w-3 text-gray-500" />
                                                )}
                                            </button>
                                            {!isLexiconCollapsed && results.lexicon.items.slice(0, 4).map((item: any) => (
                                                <button
                                                    key={item.urlSlug}
                                                    onClick={() => handleLexiconClick(item.urlSlug)}
                                                    className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
                                                    style={{ height: '60px' }}
                                                >
                                                    <div className="flex items-center gap-3 h-full">
                                                        <div className="flex-1 text-left min-w-0">
                                                            <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                                                                {item.title}
                                                            </div>
                                                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                                {truncateDescription(item.description)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                            <button
                                                onClick={handleSeeAllLexiconClick}
                                                className="w-full py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center font-medium text-brand-red hover:text-red-700 dark:hover:text-red-400 text-xs"
                                            >
                                                See all lexicon results →
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    No results found for &quot;{query}&quot;
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 