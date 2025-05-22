import { Badge, BadgeProps } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TagBadgeProps extends BadgeProps {
  tag: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
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
      {...props}
    >
      {tag}
    </Badge>
  );

  if (href) {
    return <Link href={href}>{badgeContent}</Link>;
  }

  return badgeContent;
}