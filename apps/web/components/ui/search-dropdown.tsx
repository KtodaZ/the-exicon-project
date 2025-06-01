import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Search, ExternalLink } from 'lucide-react';
import { Input } from './input';
import { useDebounce } from '@/lib/hooks/use-debounce';
import Image from 'next/image';
import { ExercisePlaceholder } from './exercise-placeholder';

interface SearchResult {
    _id: string;
    name: string;
    description: string;
    urlSlug: string;
    image_url?: string | null;
    tags?: string[];
}

interface SearchDropdownProps {
    className?: string;
    placeholder?: string;
}

export function SearchDropdown({
    className = '',
    placeholder = 'Search exercises...'
}: SearchDropdownProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const debouncedQuery = useDebounce(query, 300);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Fetch search results
    useEffect(() => {
        async function fetchResults() {
            if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
                setResults([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(`/api/exercises?query=${encodeURIComponent(debouncedQuery)}&limit=10`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data.exercises || []);
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            }
            setIsLoading(false);
        }

        fetchResults();
    }, [debouncedQuery]);

    // Show dropdown when there's a query and results
    useEffect(() => {
        setIsOpen(query.trim().length >= 2 && (results.length > 0 || isLoading));
    }, [query, results.length, isLoading]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    };

    const handleExerciseClick = (urlSlug: string) => {
        setIsOpen(false);
        setQuery('');
        router.push(`/exicon/${urlSlug}`);
    };

    const handleSeeAllClick = () => {
        setIsOpen(false);
        const searchQuery = query.trim();
        setQuery('');
        router.push(`/exicon?query=${encodeURIComponent(searchQuery)}`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            handleSeeAllClick();
        }
    };

    const truncateDescription = (text: string, maxLength: number = 80) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <Input
                        ref={inputRef}
                        type="search"
                        placeholder={placeholder}
                        value={query}
                        onChange={handleInputChange}
                        className="pl-10 pr-4 h-10 w-full"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                </div>
            </form>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto overscroll-contain"
                     style={{ 
                       WebkitOverflowScrolling: 'touch',
                       touchAction: 'pan-y'
                     }}>
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">
                            <div className="animate-spin h-4 w-4 border-2 border-brand-red border-t-transparent rounded-full mx-auto mb-2"></div>
                            Searching...
                        </div>
                    ) : results.length > 0 ? (
                        <>
                            {results.slice(0, 5).map((exercise) => (
                                <button
                                    key={exercise._id}
                                    onClick={() => handleExerciseClick(exercise.urlSlug)}
                                    className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                    style={{ height: '60px' }}
                                >
                                    <div className="flex items-center gap-3 h-full">
                                        {/* Exercise image */}
                                        <div className="flex-shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                                            {exercise.image_url ? (
                                                <Image
                                                    src={exercise.image_url}
                                                    alt={exercise.name}
                                                    width={48}
                                                    height={48}
                                                    className="object-cover w-full h-full"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ExercisePlaceholder
                                                        title={exercise.name}
                                                        tags={exercise.tags}
                                                        className="!w-8 !h-8"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Exercise info */}
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                                                {exercise.name}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                {truncateDescription(exercise.description)}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}

                            {/* See all results button */}
                            <button
                                onClick={handleSeeAllClick}
                                className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-600 text-center text-sm font-medium text-brand-red hover:text-red-700 dark:hover:text-red-400 flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="h-4 w-4" />
                                See all results
                            </button>
                        </>
                    ) : query.trim().length >= 2 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No exercises found for &quot;{query}&quot;
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
} 