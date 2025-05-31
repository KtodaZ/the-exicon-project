import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LexiconTextRenderer } from './lexicon-text-renderer';

interface LexiconItem {
  _id: string;
  title: string;
  urlSlug: string;
  description: string;
}

interface LexiconAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

export function LexiconAutocomplete({
  value,
  onChange,
  placeholder,
  maxLength,
  className = '',
  disabled = false,
}: LexiconAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LexiconItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [atPosition, setAtPosition] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce search queries
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const searchLexicon = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/lexicon/suggestions?q=${encodeURIComponent(query)}&limit=50&full=true`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.lexicon || []);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching lexicon:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    
    // Check for @ symbol before cursor
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      // Check if there's a space or newline after the last @ symbol
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setAtPosition(lastAtSymbol);
        setSearchQuery(textAfterAt);
        setShowSuggestions(true);
        setSelectedIndex(-1);
        
        // Debounce the search
        if (searchTimeout) clearTimeout(searchTimeout);
        const timeout = setTimeout(() => searchLexicon(textAfterAt), 200);
        setSearchTimeout(timeout);
        
        return;
      }
    }
    
    // Hide suggestions if no active @ search
    setShowSuggestions(false);
    setSuggestions([]);
    setAtPosition(-1);
    setSearchQuery('');
  }, [onChange, searchLexicon, searchTimeout]);

  const insertLexiconLink = useCallback((lexicon: LexiconItem) => {
    if (!textareaRef.current || atPosition === -1) return;
    
    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Find the end of the current search query
    const searchStart = atPosition + 1;
    const searchText = textBeforeCursor.substring(searchStart);
    
    // Create the lexicon link
    const lexiconLink = `[${lexicon.title}](@${lexicon.urlSlug})`;
    
    // Replace the @ and search text with the lexicon link
    const beforeAt = value.substring(0, atPosition);
    const newValue = beforeAt + lexiconLink + textAfterCursor;
    const newCursorPosition = beforeAt.length + lexiconLink.length;
    
    onChange(newValue);
    
    // Hide suggestions
    setShowSuggestions(false);
    setSuggestions([]);
    setAtPosition(-1);
    setSearchQuery('');
    
    // Set cursor position after the inserted link
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  }, [value, onChange, atPosition]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
        
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          insertLexiconLink(suggestions[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSuggestions([]);
        setAtPosition(-1);
        setSearchQuery('');
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, insertLexiconLink]);

  // Calculate character count (excluding markdown syntax)
  const getDisplayCharacterCount = useCallback((text: string) => {
    // Remove lexicon link markdown syntax for character counting
    const withoutLexiconLinks = text.replace(/\[([^\]]+)\]\(@([^)]+)\)/g, '$1');
    // Remove other markdown link syntax
    const withoutLinks = withoutLexiconLinks.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    return withoutLinks.length;
  }, []);

  const displayCharCount = getDisplayCharacterCount(value);
  const isOverLimit = maxLength ? displayCharCount > maxLength : false;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSuggestions]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            isOverLimit ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          rows={3}
        />
        
        {maxLength && (
          <div className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
            {displayCharCount}/{maxLength}
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="px-4 py-2 text-gray-500 text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mx-auto"></div>
              <span className="ml-2">Searching...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {searchQuery && (
                <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
                  Search: "{searchQuery}"
                </div>
              )}
              {suggestions.map((lexicon, index) => (
                <button
                  key={lexicon._id}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                    index === selectedIndex ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => insertLexiconLink(lexicon)}
                  type="button"
                >
                  <div className="font-medium text-gray-900 truncate">
                    {lexicon.title}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {lexicon.description}
                  </div>
                </button>
              ))}
            </>
          ) : searchQuery ? (
            <div className="px-4 py-2 text-gray-500 text-center">
              No lexicon terms found for "{searchQuery}"
            </div>
          ) : null}
        </div>
      )}

      {/* Live preview */}
      {value && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="text-sm font-medium text-gray-700 mb-2">Preview:</div>
          <div className="text-sm">
            <LexiconTextRenderer text={value} />
          </div>
        </div>
      )}
    </div>
  );
}