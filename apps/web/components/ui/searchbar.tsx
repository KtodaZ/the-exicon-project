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
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, onSearch, buttonText = "Search", buttonVariant = "red", showButton = true, iconSize = 4, ...props }, ref) => {
    const [value, setValue] = React.useState(props.defaultValue || "");
    
    // Update internal state when defaultValue changes
    React.useEffect(() => {
      setValue(props.defaultValue || "");
    }, [props.defaultValue]);
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onSearch) {
        onSearch(value as string);
      }
    };

    return (
      <form onSubmit={handleSubmit} className={cn("relative", className)}>
        <Input
          ref={ref}
          type="search"
          className={`pl-10 pr-${showButton ? '20' : '4'}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={props.placeholder}
        />
        <Search className={`absolute left-3 top-2.5 h-${iconSize} w-${iconSize} text-gray-500`} />
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