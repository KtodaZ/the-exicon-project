import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function titleCase(text: string): string {
  return text.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
