import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Badge } from './badge';
import { titleCase } from '@/lib/utils';

interface TagsAutocompleteProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagsAutocomplete({ 
  selectedTags, 
  onTagsChange, 
  placeholder = "Add a tag...",
  className 
}: TagsAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        
        if (data.success) {
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // Filter tags based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredTags(availableTags.filter(tag => !selectedTags.includes(tag)));
    } else {
      const filtered = availableTags.filter(tag => 
        tag.toLowerCase().includes(inputValue.toLowerCase()) && 
        !selectedTags.includes(tag)
      );
      setFilteredTags(filtered);
    }
    setHighlightedIndex(-1);
  }, [inputValue, availableTags, selectedTags]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(true);
  };

  // Handle input focus - show all tags
  const handleInputFocus = () => {
    setShowDropdown(true);
    // If no input, show all available tags
    if (!inputValue.trim()) {
      setFilteredTags(availableTags.filter(tag => !selectedTags.includes(tag)));
    }
  };

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag]);
    }
    setInputValue('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Handle manual tag addition (when user types and presses Enter)
  const handleAddCustomTag = () => {
    const trimmedTag = inputValue.trim().toLowerCase();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onTagsChange([...selectedTags, trimmedTag]);
      setInputValue('');
      setShowDropdown(false);
    }
  };

  // Handle tag removal
  const handleTagRemove = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredTags.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustomTag();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredTags.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredTags.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredTags.length) {
          handleTagSelect(filteredTags[highlightedIndex]);
        } else {
          handleAddCustomTag();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
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
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Tags
      </label>
      
      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => handleTagRemove(tag)}
            >
              {titleCase(tag)} ×
            </Badge>
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={loading ? "Loading tags..." : placeholder}
            disabled={loading}
            className="flex-1"
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleAddCustomTag}
            disabled={!inputValue.trim()}
          >
            Add
          </Button>
        </div>

        {/* Dropdown */}
        {showDropdown && (filteredTags.length > 0 || (!inputValue.trim() && availableTags.length > 0)) && (
          <div 
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            {filteredTags.map((tag, index) => (
              <div
                key={tag}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                  index === highlightedIndex ? 'bg-blue-100' : ''
                }`}
                onClick={() => handleTagSelect(tag)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="text-sm">{titleCase(tag)}</span>
              </div>
            ))}
            
            {/* Show option to add custom tag if it doesn't exist */}
            {inputValue.trim() && !availableTags.includes(inputValue.trim().toLowerCase()) && (
              <div
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200 ${
                  highlightedIndex === filteredTags.length ? 'bg-blue-100' : ''
                }`}
                onClick={handleAddCustomTag}
                onMouseEnter={() => setHighlightedIndex(filteredTags.length)}
              >
                <span className="text-sm text-gray-600">
                  Add "{titleCase(inputValue.trim())}" as new tag
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        Start typing to see suggestions, or add your own tags
      </p>
    </div>
  );
} 