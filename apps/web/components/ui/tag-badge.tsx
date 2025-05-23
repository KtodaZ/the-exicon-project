import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TagBadgeProps {
  tag: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  variant?: "default" | "secondary" | "destructive" | "outline" | "red";
  className?: string;
}

export function TagBadge({ 
  tag, 
  active = false, 
  onClick, 
  href, 
  className, 
  variant = "secondary",
  ...props
}: TagBadgeProps) {
  const badgeContent = (
    <Badge
      variant={active ? "red" : variant}
      className={cn(
        "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors", 
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {tag}
    </Badge>
  );

  if (href) {
    return <Link href={href}>{badgeContent}</Link>;
  }

  return badgeContent;
}