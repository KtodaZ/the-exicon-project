import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Badge } from './badge';
import { ExerciseTextRenderer } from './exercise-text-renderer';

interface Exercise {
  _id: string;
  name: string;
  urlSlug: string;
}

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

export function ExerciseAutocomplete({
  value,
  onChange,
  placeholder = "Type @ to mention an exercise...",
  className,
  maxLength
}: ExerciseAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Exercise[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentMention, setCurrentMention] = useState<{
    query: string;
    startIndex: number;
    endIndex: number;
  } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect @ mentions in the text
  useEffect(() => {
    if (!inputRef.current) return;

    const text = value;
    const cursor = inputRef.current.selectionStart || 0;

    // Find @ symbol before cursor
    let atIndex = -1;
    for (let i = cursor - 1; i >= 0; i--) {
      if (text[i] === '@') {
        atIndex = i;
        break;
      }
      if (text[i] === ' ' || text[i] === '\n') {
        break;
      }
    }

    if (atIndex >= 0) {
      // Find end of mention (space, newline, or end of text)
      let endIndex = cursor;
      for (let i = cursor; i < text.length; i++) {
        if (text[i] === ' ' || text[i] === '\n') {
          endIndex = i;
          break;
        }
      }

      const query = text.substring(atIndex + 1, cursor);

      setCurrentMention({
        query,
        startIndex: atIndex,
        endIndex: cursor
      });

      // Search for exercises if query is long enough
      if (query.length >= 1) {
        searchExercises(query);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } else {
      setCurrentMention(null);
      setShowDropdown(false);
      setSuggestions([]);
    }
  }, [value, cursorPosition]);

  // Search for exercises
  const searchExercises = async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/exercises/suggestions?q=${encodeURIComponent(query)}&limit=50&full=true`);
      const data = await response.json();

      if (data.success && data.exercises) {
        setSuggestions(data.exercises);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching exercises:', error);
      setSuggestions([]);
    }
  };

  // Handle exercise selection
  const handleExerciseSelect = (exercise: Exercise) => {
    if (!currentMention) return;

    const beforeMention = value.substring(0, currentMention.startIndex);
    const afterMention = value.substring(currentMention.endIndex);
    const reference = `[${exercise.name}](@${exercise.urlSlug})`;

    const newValue = beforeMention + reference + afterMention;
    onChange(newValue);

    setShowDropdown(false);
    setCurrentMention(null);
    setSuggestions([]);

    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition = beforeMention.length + reference.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleExerciseSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Enforce character limit if provided
    // Allow the change if:
    // 1. No maxLength is set, OR
    // 2. New value is within limit, OR  
    // 3. New value is shorter than current (allowing deletions)
    if (maxLength && newValue.length > maxLength && newValue.length > value.length) {
      return; // Only prevent if exceeding limit AND adding characters
    }
    
    onChange(newValue);
  };

  // Handle cursor position change
  const handleSelectionChange = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0);
    }
  };

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={className}>
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          placeholder={placeholder}
          className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[120px] font-mono text-sm"
          rows={6}
          maxLength={maxLength}
        />

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && currentMention && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto"
          >
            <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-600">
              {suggestions.length} exercise{suggestions.length !== 1 ? 's' : ''} found - type @ to search
            </div>
            {suggestions.map((exercise, index) => (
              <div
                key={exercise._id}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === highlightedIndex ? 'bg-blue-100' : ''
                  }`}
                onClick={() => handleExerciseSelect(exercise)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="text-sm font-medium">{exercise.name}</div>
                <div className="text-xs text-gray-500">@{exercise.urlSlug}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="flex justify-between items-center mt-1">
        <p className="text-xs text-gray-500">
          Type @ followed by an exercise name to create a reference. Example: @burpee
        </p>
        {maxLength && (
          <p className={`text-xs ${value.length > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-500'}`}>
            {value.length}/{maxLength}
          </p>
        )}
      </div>

      {/* Preview of references */}
      {value && value.includes('[') && value.includes('](@') && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <div className="text-xs font-medium text-gray-700 mb-2">Preview:</div>
          <div className="text-sm">
            <ExerciseTextRenderer text={value} />
          </div>
        </div>
      )}
    </div>
  );
}