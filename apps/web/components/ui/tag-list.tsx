import * as React from "react";
import { TagBadge } from "@/components/ui/tag-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

export interface TagListProps extends React.HTMLAttributes<HTMLDivElement> {
  tags: string[] | { tag: string; count?: number }[];
  activeTags?: string[];
  onTagClick?: (tag: string) => void;
  variant?: "secondary" | "outline" | "default" | "red";
  showCounts?: boolean;
  initialDisplayCount?: number;
  showViewMore?: boolean;
}

export function TagList({
  className,
  tags,
  activeTags = [],
  onTagClick,
  variant = "secondary",
  showCounts = true,
  initialDisplayCount = 20,
  showViewMore = true,
  ...props
}: TagListProps) {
  const [showAll, setShowAll] = React.useState(false);

  const handleClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  const displayTags = showAll || !showViewMore ? tags : tags.slice(0, initialDisplayCount);
  const hasMoreTags = tags.length > initialDisplayCount && showViewMore;

  return (
    <div className={cn("flex flex-wrap gap-2", className)} {...props}>
      {displayTags.map((tagItem, index) => {
        const isObject = typeof tagItem !== 'string';
        const tag = isObject ? tagItem.tag : tagItem;
        const count = isObject && tagItem.count !== undefined ? tagItem.count : undefined;
        
        return (
          <TagBadge
            key={`${tag}-${index}`}
            tag={showCounts && count !== undefined ? `${tag} (${count})` : tag}
            active={activeTags.includes(tag)}
            onClick={() => handleClick(tag)}
            variant={variant}
          />
        );
      })}
      
      {hasMoreTags && !showAll && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(true)}
          className="h-6 px-2 text-xs border-dashed hover:border-solid"
        >
          <MoreHorizontal className="h-3 w-3 mr-1" />
          +{tags.length - initialDisplayCount} more
        </Button>
      )}
      
      {showAll && hasMoreTags && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(false)}
          className="h-6 px-2 text-xs border-dashed hover:border-solid"
        >
          Show less
        </Button>
      )}
    </div>
  );
} 