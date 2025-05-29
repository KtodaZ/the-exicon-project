import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
  buttonText?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive" | "red";
  showButton?: boolean;
  iconSize?: number;
  rotatingPlaceholders?: string[];
  filterPills?: React.ReactNode;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, onSearch, buttonText = "Search", buttonVariant = "red", showButton = true, iconSize = 4, rotatingPlaceholders, filterPills, ...props }, ref) => {
    const [value, setValue] = React.useState(props.defaultValue || "");
    const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = React.useState(0);
    
    // Update internal state when defaultValue changes
    React.useEffect(() => {
      setValue(props.defaultValue || "");
    }, [props.defaultValue]);

    // Rotate placeholders if provided
    React.useEffect(() => {
      if (rotatingPlaceholders && rotatingPlaceholders.length > 1) {
        const interval = setInterval(() => {
          setCurrentPlaceholderIndex((prev) => (prev + 1) % rotatingPlaceholders.length);
        }, 3000); // Change every 3 seconds
        
        return () => clearInterval(interval);
      }
    }, [rotatingPlaceholders]);
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onSearch) {
        onSearch(value as string);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      if (onSearch) {
        onSearch(newValue);
      }
    };

    // Get current placeholder
    const currentPlaceholder = rotatingPlaceholders && rotatingPlaceholders.length > 0
      ? rotatingPlaceholders[currentPlaceholderIndex]
      : props.placeholder;

    return (
      <form onSubmit={handleSubmit} className={cn("relative", className)}>
        <div className="relative">
          <Input
            ref={ref}
            type="search"
            className={cn(
              `pl-12 pr-${showButton ? '20' : '4'} text-lg h-12`,
              rotatingPlaceholders ? 'placeholder:opacity-0' : '',
              filterPills && !value ? 'placeholder:opacity-0' : '',
              className
            )}
            value={value}
            onChange={handleChange}
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
    );
  }
);

SearchBar.displayName = "SearchBar"; 