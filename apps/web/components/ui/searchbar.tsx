import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CombinedSearchDropdown } from "@/components/ui/combined-search-dropdown";

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
  buttonText?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "outline-red" | "ghost" | "link" | "destructive" | "red";
  showButton?: boolean;
  iconSize?: number;
  rotatingPlaceholders?: string[];
  filterPills?: React.ReactNode;
  showCombinedSearch?: boolean;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, onSearch, buttonText = "Search", buttonVariant = "red", showButton = true, iconSize = 4, rotatingPlaceholders, filterPills, showCombinedSearch = false, ...props }, ref) => {
    const [value, setValue] = React.useState(String(props.defaultValue || ""));
    const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = React.useState(0);
    const [isFirstShow, setIsFirstShow] = React.useState(true);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const searchRef = React.useRef<HTMLDivElement>(null);

    // Update internal state when defaultValue changes
    React.useEffect(() => {
      setValue(String(props.defaultValue || ""));
    }, [props.defaultValue]);

    // Handle clicks outside dropdown
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Rotate placeholders if provided
    React.useEffect(() => {
      if (rotatingPlaceholders && rotatingPlaceholders.length > 1) {
        const interval = setInterval(() => {
          setCurrentPlaceholderIndex((prev) => {
            // If this is the first rotation, always show the first placeholder first
            if (isFirstShow) {
              setIsFirstShow(false);
              return 0;
            }

            // After the first show, randomly select from all placeholders except the current one
            let newIndex;
            do {
              newIndex = Math.floor(Math.random() * rotatingPlaceholders.length);
            } while (newIndex === prev && rotatingPlaceholders.length > 1);
            return newIndex;
          });
        }, 3000); // Change every 3 seconds

        return () => clearInterval(interval);
      }
    }, [rotatingPlaceholders, isFirstShow]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onSearch) {
        onSearch(value as string);
      }
      setShowDropdown(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      if (onSearch) {
        onSearch(newValue);
      }
      
      // Show dropdown when typing if combined search is enabled
      if (showCombinedSearch) {
        setShowDropdown(newValue.trim().length > 0);
      }
    };

    const handleFocus = () => {
      if (showCombinedSearch && String(value).trim().length > 0) {
        setShowDropdown(true);
      }
    };

    const handleResultClick = () => {
      setShowDropdown(false);
    };

    // Get current placeholder
    const currentPlaceholder = rotatingPlaceholders && rotatingPlaceholders.length > 0
      ? rotatingPlaceholders[currentPlaceholderIndex]
      : props.placeholder;

    return (
      <div ref={searchRef} className={cn("relative", className)}>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Input
              ref={ref}
              type="search"
              className={cn(
                `pl-12 pr-${showButton ? '20' : '4'} text-lg h-12`,
                rotatingPlaceholders ? 'placeholder:opacity-0' : '',
                filterPills && !value ? 'placeholder:opacity-0' : '',
              )}
              value={value}
              onChange={handleChange}
              onFocus={handleFocus}
              placeholder={!rotatingPlaceholders && !filterPills ? props.placeholder : ''}
            />

            {/* Filter pills inside search bar when no input */}
            {filterPills && !value && (
              <div className="absolute right-4 top-0 h-12 flex items-center pointer-events-auto">
                {filterPills}
              </div>
            )}

            {/* Custom animated placeholder */}
            {rotatingPlaceholders && !value && !filterPills && (
              <div className="absolute left-12 top-0 h-12 flex items-center pointer-events-none overflow-hidden">
                <div
                  key={currentPlaceholderIndex}
                  className="text-lg text-gray-500 animate-billboard-slide"
                  style={{
                    animation: 'billboard-slide 0.8s ease-out'
                  }}
                >
                  {currentPlaceholder}
                </div>
              </div>
            )}
          </div>
          <Search className={`absolute left-4 top-3.5 h-5 w-5 text-gray-500`} />
          {showButton && (
            <Button
              type="submit"
              className="absolute right-1 top-1 h-7 px-2 rounded-md"
              variant={buttonVariant}
            >
              {buttonText}
            </Button>
          )}
        </form>

        {/* Combined Search Dropdown */}
        {showCombinedSearch && showDropdown && (
          <CombinedSearchDropdown
            searchQuery={value as string}
            onResultClick={handleResultClick}
          />
        )}
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar"; 