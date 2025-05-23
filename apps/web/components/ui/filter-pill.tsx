import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterPillProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  onRemove?: () => void;
  variant?: "default" | "gray";
}

export function FilterPill({
  className,
  label,
  value,
  onRemove,
  variant = "default",
  ...props
}: FilterPillProps) {
  const variantClasses = {
    default: "bg-primary/10 text-primary dark:bg-primary/20",
    gray: "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-200"
  };

  return (
    <div
      className={cn(
        "flex items-center rounded-md px-3 py-1",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <span className="text-sm mr-1">{label}:</span>
      <span className="text-sm font-medium mr-2">{value}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label={`Remove ${label}: ${value}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
} 