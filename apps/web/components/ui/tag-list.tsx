import * as React from "react";
import { TagBadge } from "@/components/ui/tag-badge";
import { cn } from "@/lib/utils";

export interface TagListProps extends React.HTMLAttributes<HTMLDivElement> {
  tags: string[] | { tag: string; count?: number }[];
  activeTags?: string[];
  onTagClick?: (tag: string) => void;
  variant?: "secondary" | "outline" | "default" | "red";
  showCounts?: boolean;
}

export function TagList({
  className,
  tags,
  activeTags = [],
  onTagClick,
  variant = "secondary",
  showCounts = true,
  ...props
}: TagListProps) {
  const handleClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)} {...props}>
      {tags.map((tagItem, index) => {
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
    </div>
  );
} 