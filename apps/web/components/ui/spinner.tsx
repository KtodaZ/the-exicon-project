import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "red";
}

export function Spinner({
  className,
  size = "md",
  variant = "default",
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  const variantClasses = {
    default: "border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300",
    primary: "border-gray-300 border-t-primary dark:border-gray-600 dark:border-t-primary",
    red: "border-gray-300 border-t-[#AD0C02] dark:border-gray-600 dark:border-t-[#AD0C02]",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-solid",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
} 