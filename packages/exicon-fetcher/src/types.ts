// Types for API responses

export interface Category {
  _id: string;
  label: string;
  urlSlug: string;
  imageUrl?: string;
  imageAltText?: string;
  description?: string;
  [key: string]: any;
}

export interface Author {
  _id: string;
  name: string;
  imageUrl?: string;
  imageAltText?: string;
  description?: string;
  socials?: any[];
  [key: string]: any;
}

export interface BlogPostSummary {
  _id: string;
  title: string;
  urlSlug: string;
  description: string;
  imageUrl?: string;
  imageAltText?: string;
  categories: Category[];
  tags: string[];
  author: Author;
  updatedAt: string;
  publishedAt: string;
  scheduledAt: string | null;
  readTimeInMinutes: number;
  content: string;
  blogId: string;
  [key: string]: any;
}

export interface BlogPostDetail {
  _id: string;
  title: string;
  description: string;
  urlSlug: string;
  rawHTML: string;
  categories: Category[];
  tags: string[];
  type: string;
  status: string;
  locationId: string;
  blogId: string;
  currentVersion: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  scheduledAt: string | null;
  homeUrl: string;
  externalFonts: string[];
  wordCount: number;
  readTimeInMinutes: number;
  imageUrl?: string;
  imageAltText?: string;
  metaData: {
    scheduledBy: string | null;
    parentTaskId: string | null;
    childTaskId: string | null;
    childTaskError: string | null;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface BlogPostListResponse {
  blogPosts: BlogPostSummary[];
  categoryDetails: any;
  count: number;
  traceId: string;
}

export interface BlogPostContentResponse {
  blogPost: BlogPostDetail;
  traceId: string;
}

export interface VideoMap {
  [urlSlug: string]: string[];
}

// Simplified exicon item format
export interface SimplifiedExiconItem {
  external_id: string;
  video_url: string | null;
  categories: string;  // Comma-separated list of categories
  name: string;
  description: string;
  urlSlug: string;
  text: string;  // Parsed text from rawHTML
  sourceRawHTML: string;
  postURL: string;
}

// Enhanced exicon item with additional fields from OpenAI
export interface EnhancedExiconItem extends SimplifiedExiconItem {
  aliases: string[];
  // Add more enhancement fields here as needed
} 