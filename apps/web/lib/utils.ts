import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Removes duplicate records by `_id`, keeping the first occurrence.
 * Paginated results can overlap (the server-rendered first page and the API use
 * slightly different sorting), which would otherwise render duplicate cards.
 */
export function uniqueById<T extends { _id: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter(item => {
    if (seen.has(item._id)) {
      return false;
    }
    seen.add(item._id);
    return true;
  });
}

export function titleCase(text: string): string {
  return text.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Strip markdown formatting from text for use in meta descriptions
 * Removes exercise references like [Exercise Name](@exercise-slug) and other markdown syntax
 */
export function stripMarkdownForMeta(text: string): string {
  if (!text) return '';
  
  // Remove exercise references like [Exercise Name](@exercise-slug)
  let cleaned = text.replace(/\[([^\]]+)\]\(@[^)]+\)/g, '$1');
  
  // Remove any remaining markdown formatting
  cleaned = cleaned
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1')     // Italic
    .replace(/`(.*?)`/g, '$1')       // Code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/#{1,6}\s?(.*)/g, '$1') // Headers
    .replace(/>\s?(.*)/g, '$1')      // Blockquotes
    .replace(/\n+/g, ' ')            // Line breaks to spaces
    .trim();
  
  // Truncate to reasonable length for meta description
  if (cleaned.length > 155) {
    cleaned = cleaned.substring(0, 152) + '...';
  }
  
  return cleaned;
}

/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}
