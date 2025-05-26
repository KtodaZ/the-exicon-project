import * as React from "react";
import { FilterPill } from "@/components/ui/filter-pill";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterItem {
  type: string;
  value: string;
}

export interface ActiveFiltersProps extends React.HTMLAttributes<HTMLDivElement> {
  filters: FilterItem[];
  onRemove?: (filter: FilterItem) => void;
  onClearAll?: () => void;
  variant?: "default" | "gray";
  showClearAll?: boolean;
}

export function ActiveFilters({
  className,
  filters,
  onRemove,
  onClearAll,
  variant = "gray",
  showClearAll = true,
  ...props
}: ActiveFiltersProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={className} {...props}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Active Filters
        </h2>
        {showClearAll && onClearAll && (
          <Button
            onClick={onClearAll}
            variant="ghost"
            className="h-8 px-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter, index) => (
          <FilterPill
            key={`${filter.type}-${filter.value}-${index}`}
            label={filter.type}
            value={filter.value}
            variant={variant}
            onRemove={onRemove ? () => onRemove(filter) : undefined}
          />
        ))}
      </div>
    </div>
  );
} 