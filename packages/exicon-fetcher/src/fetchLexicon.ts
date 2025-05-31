import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { LexiconApiResponse, LexiconContentResponse, SimplifiedLexiconItem } from './types';

// API endpoints
const LOCATION_ID = 'SrfvOYstGSlBjAXxhvwX';
const BLOG_ID = 'WGtBa9FCWpEgar0Eam2a';
const LIST_API_URL = `https://backend.leadconnectorhq.com/blogs/posts/list?locationId=${LOCATION_ID}&blogId=${BLOG_ID}&limit=10000&offset=0`;
const CONTENT_API_URL = `https://backend.leadconnectorhq.com/blogs/posts/content?locationId=${LOCATION_ID}&urlSlug=`;

// File paths
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');
const CACHE_DIR = path.join(OUTPUT_DIR, 'cache');
const API_CACHE_DIR = path.join(CACHE_DIR, 'api');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'lexicon-items.json');

// Function to extract text from HTML (copied from fetchExicons.ts)
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

async function setupDirectories() {
  await fs.ensureDir(OUTPUT_DIR);
  await fs.ensureDir(CACHE_DIR);
  await fs.ensureDir(API_CACHE_DIR);
}

// Fetch individual lexicon post details with caching
async function fetchLexiconPostDetail(urlSlug: string): Promise<LexiconContentResponse> {
  const cacheFilePath = path.join(API_CACHE_DIR, `lexicon-${urlSlug}-detail.json`);
  
  try {
    // Check if cache exists
    if (await fs.pathExists(cacheFilePath)) {
      console.log(`  Using cached detail for ${urlSlug}`);
      return await fs.readJSON(cacheFilePath) as LexiconContentResponse;
    }
    
    // Cache not found, fetch from API
    const url = `${CONTENT_API_URL}${urlSlug}`;
    console.log(`  Fetching from API: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} for ${url}`);
    }
    
    const data = await response.json() as LexiconContentResponse;
    
    // Cache the API response
    await fs.writeJSON(cacheFilePath, data, { spaces: 2 });
    console.log(`  Cached detail for ${urlSlug}`);
    
    return data;
  } catch (error) {
    console.error(`Error fetching lexicon post detail for "${urlSlug}":`, error);
    throw error;
  }
}

async function fetchLexicon(): Promise<void> {
  try {
    console.log('Starting lexicon fetch with individual content calls...');
    console.log(`Fetching from: ${LIST_API_URL}`);
    
    // Ensure directories exist
    await setupDirectories();
    
    // Fetch data from the API
    const response = await fetch(LIST_API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as LexiconApiResponse;
    
    console.log(`Retrieved ${data.blogPosts.length} lexicon items`);
    console.log(`Total count from API: ${data.count}`);
    console.log('Now fetching individual content for each item...');
    
    // Fetch detailed content for each lexicon item
    const simplifiedItems: SimplifiedLexiconItem[] = [];
    
    for (let i = 0; i < data.blogPosts.length; i++) {
      const post = data.blogPosts[i];
      
      try {
        console.log(`Processing ${i + 1}/${data.blogPosts.length}: ${post.title}`);
        
        // Fetch detailed content
        const detailResponse = await fetchLexiconPostDetail(post.urlSlug);
        const detail = detailResponse.blogPost;
        
        // Extract description from rawHTML
        const extractedDescription = extractTextFromHtml(detail.rawHTML);
        
        // Create simplified item
        const simplifiedItem: SimplifiedLexiconItem = {
          _id: post._id,
          title: post.title,
          description: extractedDescription || post.description, // Use extracted text or fallback to original
          urlSlug: post.urlSlug,
          rawHTML: detail.rawHTML
        };
        
        simplifiedItems.push(simplifiedItem);
        
        // Add a small delay to be respectful to the API
        if (i < data.blogPosts.length - 1) {
          await setTimeout(100); // 100ms delay between requests
        }
        
      } catch (error) {
        console.error(`Failed to process item ${i + 1} (${post.title}):`, error);
        // Add the item with original description if detail fetch fails
        simplifiedItems.push({
          _id: post._id,
          title: post.title,
          description: post.description,
          urlSlug: post.urlSlug,
          rawHTML: '' // Empty since we couldn't fetch it
        });
      }
    }
    
    // Save to JSON file
    await fs.writeJSON(OUTPUT_FILE, simplifiedItems, { spaces: 2 });
    
    console.log(`✅ Successfully saved ${simplifiedItems.length} lexicon items to: ${OUTPUT_FILE}`);
    
    // Display some sample items
    console.log('\nSample items with extracted descriptions:');
    simplifiedItems.slice(0, 3).forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Description: ${item.description.substring(0, 150)}${item.description.length > 150 ? '...' : ''}`);
      console.log(`   URL Slug: ${item.urlSlug}`);
      console.log(`   Has Raw HTML: ${item.rawHTML ? 'Yes' : 'No'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error fetching lexicon data:', error);
    throw error;
  }
}

// Execute the main function if this file is run directly
if (require.main === module) {
  fetchLexicon().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default fetchLexicon; 