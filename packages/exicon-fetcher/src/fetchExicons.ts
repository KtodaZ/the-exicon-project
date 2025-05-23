import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { setTimeout } from 'timers/promises';
import {
  BlogPostSummary,
  BlogPostListResponse,
  BlogPostContentResponse,
  SimplifiedExiconItem,
  VideoMap
} from './types';

// API endpoints and parameters
const LOCATION_ID = 'SrfvOYstGSlBjAXxhvwX';
const BLOG_ID = 'dp77Q982leCiEPAWzEpt';
const LIST_API_URL = `https://backend.leadconnectorhq.com/blogs/posts/list?locationId=${LOCATION_ID}&limit=10000&offset=0&blogId=${BLOG_ID}`;
const CONTENT_API_URL = `https://backend.leadconnectorhq.com/blogs/posts/content?locationId=${LOCATION_ID}&urlSlug=`;
const BASE_POST_URL = 'https://f3nation.com/exicon/';

// Create output directories
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');
const CACHE_DIR = path.join(OUTPUT_DIR, 'cache');
const API_CACHE_DIR = path.join(CACHE_DIR, 'api');

async function setupDirectories() {
  await fs.ensureDir(OUTPUT_DIR);
  await fs.ensureDir(CACHE_DIR);
  await fs.ensureDir(API_CACHE_DIR);
}

// Function to extract video URLs from HTML
function extractVideoUrls(html: string): string[] {
  const videoUrlRegex = /<video[^>]*src="([^"]*)"[^>]*>/g;
  const urls: string[] = [];
  let match;
  
  while ((match = videoUrlRegex.exec(html)) !== null) {
    if (match[1]) {
      urls.push(match[1]);
    }
  }
  
  return urls;
}

// Function to extract text from HTML
function extractTextFromHtml(html: string): string {
  // Remove HTML tags and keep text
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  
  return text;
}

// Function to safely get the first video URL or null
function getFirstVideoUrl(videoUrls: string[]): string | null {
  if (videoUrls && videoUrls.length > 0 && videoUrls[0]) {
    return videoUrls[0];
  }
  return null;
}

// Fetch all blog posts list with caching
async function fetchBlogPostsList(): Promise<BlogPostSummary[]> {
  const cacheFilePath = path.join(API_CACHE_DIR, 'blog-posts-list.json');
  
  try {
    // Check if cache exists
    if (await fs.pathExists(cacheFilePath)) {
      console.log('Using cached blog posts list');
      const cachedData = await fs.readJSON(cacheFilePath) as BlogPostListResponse;
      return cachedData.blogPosts;
    }
    
    // Cache not found, fetch from API
    console.log(`Fetching blog posts list from: ${LIST_API_URL}`);
    const response = await fetch(LIST_API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json() as BlogPostListResponse;
    console.log(`Found ${data.count} blog posts`);
    
    // Save the full response for reference
    await fs.writeJSON(path.join(OUTPUT_DIR, 'all-posts.json'), data, { spaces: 2 });
    
    // Cache the API response
    await fs.writeJSON(cacheFilePath, data, { spaces: 2 });
    console.log('Cached blog posts list for future use');
    
    return data.blogPosts;
  } catch (error) {
    console.error('Error fetching blog posts list:', error);
    throw error;
  }
}

// Fetch individual blog post details with caching
async function fetchBlogPostDetail(urlSlug: string): Promise<BlogPostContentResponse> {
  const cacheFilePath = path.join(API_CACHE_DIR, `${urlSlug}-detail.json`);
  
  try {
    // Check if cache exists
    if (await fs.pathExists(cacheFilePath)) {
      console.log(`  Using cached detail for ${urlSlug}`);
      return await fs.readJSON(cacheFilePath) as BlogPostContentResponse;
    }
    
    // Cache not found, fetch from API
    const url = `${CONTENT_API_URL}${urlSlug}`;
    console.log(`  Fetching from API: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json() as BlogPostContentResponse;
    
    // Cache the API response
    await fs.writeJSON(cacheFilePath, data, { spaces: 2 });
    console.log(`  Cached detail for ${urlSlug}`);
    
    return data;
  } catch (error) {
    console.error(`Error fetching blog post detail for "${urlSlug}":`, error);
    throw error;
  }
}

// Convert blog post details to simplified format
function simplifyExiconItem(post: BlogPostSummary, detail: BlogPostContentResponse): SimplifiedExiconItem {
  const videoUrls = extractVideoUrls(detail.blogPost.rawHTML);
  const categoryLabels = detail.blogPost.categories.map(cat => {
    // Convert category label to lowercase with hyphens instead of spaces
    return cat.label.toLowerCase().replace(/\s+/g, '-');
  });
  
  return {
    external_id: post._id,
    video_url: getFirstVideoUrl(videoUrls),
    image_url: post.imageUrl || detail.blogPost.imageUrl || null,
    categories: categoryLabels.join(', '),
    name: post.title,
    description: post.description,
    urlSlug: post.urlSlug,
    text: extractTextFromHtml(detail.blogPost.rawHTML),
    sourceRawHTML: detail.blogPost.rawHTML,
    postURL: `${BASE_POST_URL}${post.urlSlug}`,
    publishedAt: post.publishedAt || detail.blogPost.publishedAt
  };
}

// Function to save data to CSV
async function saveToCSV(items: SimplifiedExiconItem[], filePath: string): Promise<void> {
  // Create CSV header
  const header = [
    'external_id',
    'name',
    'categories',
    'description',
    'text',
    'video_url',
    'image_url',
    'publishedAt',
    'urlSlug',
    'postURL'
  ].join(',');
  
  // Create CSV rows
  const rows = items.map(item => {
    // Escape fields that might contain commas
    const escapeCsvField = (field: string | null): string => {
      if (field === null) return '';
      // Replace double quotes with two double quotes and wrap in quotes if contains commas or quotes
      const escaped = field.replace(/"/g, '""');
      return (escaped.includes(',') || escaped.includes('"')) ? `"${escaped}"` : escaped;
    };
    
    return [
      escapeCsvField(item.external_id),
      escapeCsvField(item.name),
      escapeCsvField(item.categories),
      escapeCsvField(item.description),
      escapeCsvField(item.text),
      escapeCsvField(item.video_url),
      escapeCsvField(item.image_url),
      escapeCsvField(item.publishedAt),
      escapeCsvField(item.urlSlug),
      escapeCsvField(item.postURL)
    ].join(',');
  });
  
  // Combine header and rows
  const csvContent = [header, ...rows].join('\n');
  
  // Write to file
  await fs.writeFile(filePath, csvContent, 'utf8');
}

// Main function to fetch all exicon data
async function fetchAllExiconData() {
  try {
    console.log('Starting fetchAllExiconData()');
    console.log(`Output directory: ${OUTPUT_DIR}`);
    console.log(`Cache directory: ${CACHE_DIR}`);
    
    await setupDirectories();
    console.log('Directories set up successfully');
    
    // Step 1: Fetch the list of all blog posts
    console.log('Fetching blog posts list...');
    const blogPosts = await fetchBlogPostsList();
    
    console.log(`Starting to fetch details for ${blogPosts.length} blog posts...`);
    
    // Step 2: Fetch details for each blog post with a delay between requests
    const simplifiedItems: SimplifiedExiconItem[] = [];
    const seenNames = new Set<string>();
    
    // Limit to just a few items for testing
    const processLimit = blogPosts.length;
    console.log(`Will process ${processLimit} items`);
    
    for (let i = 0; i < processLimit; i++) {
      const post = blogPosts[i];
      
      // Skip if post is undefined (shouldn't happen but TypeScript wants a check)
      if (!post) {
        console.warn(`Post at index ${i} is undefined, skipping`);
        continue;
      }
      
      const { urlSlug, title } = post;
      
      // Skip if we've already seen this name
      if (seenNames.has(title)) {
        console.log(`  Skipping duplicate exicon with name: ${title}`);
        continue;
      }
      
      console.log(`[${i + 1}/${processLimit}] Processing: ${title} (${urlSlug})`);
      
      try {
        // Fetch the details with caching
        const detailResponse = await fetchBlogPostDetail(urlSlug);
        
        // Convert to simplified format
        console.log('  Converting to simplified format...');
        const simplifiedItem = simplifyExiconItem(post, detailResponse);
        
        // Add to the collection and mark name as seen
        simplifiedItems.push(simplifiedItem);
        seenNames.add(title);
        
        // Add a small delay between requests to avoid rate limiting
        if (i < processLimit - 1) {
          await setTimeout(100);
        }
      } catch (error) {
        console.error(`Error processing ${title}:`, error);
        // Continue with the next post even if this one fails
      }
    }
    
    console.log(`Found ${seenNames.size} unique exicons out of ${processLimit} total items`);
    
    // Save all simplified items in a single file
    const allItemsPath = path.join(OUTPUT_DIR, 'all-exicon-items.json');
    console.log(`Saving all items to ${allItemsPath}`);
    await fs.writeJSON(allItemsPath, simplifiedItems, { spaces: 2 });
    
    // Save to CSV
    const csvPath = path.join(OUTPUT_DIR, 'all-exicon-items.csv');
    console.log(`Saving CSV to ${csvPath}`);
    await saveToCSV(simplifiedItems, csvPath);
    
    console.log('Completed fetching all exicon data!');
    console.log(`Processed ${simplifiedItems.length} unique items`);
    console.log(`Data saved to: ${OUTPUT_DIR}`);
    
  } catch (error) {
    console.error('Error in fetchAllExiconData:', error);
  }
}

// Default export for the module
const fetchExicons = fetchAllExiconData;
export default fetchExicons;

// Execute the main function if this file is run directly
if (require.main === module) {
  fetchAllExiconData().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 