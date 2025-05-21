import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';
import { OpenAI } from 'openai';
import { SimplifiedExiconItem } from './types';
import { 
  processWithLLM, 
  EnhancementResult, 
  DEFAULT_ENHANCEMENT_VALUES,
  calculateCost
} from './llmProcessor';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// File paths
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');
const INPUT_FILE = path.join(OUTPUT_DIR, 'all-exicon-items.json');

// Use the same structure for both the enhanced item and the batch result
type EnhancedExiconItem = SimplifiedExiconItem & EnhancementResult;

// Function to enhance a batch of Exicon items
async function enhanceBatch(
  items: SimplifiedExiconItem[]
): Promise<{ enhancedItems: EnhancedExiconItem[], response: any }> {
  console.log(`\n📋 Processing ${items.length} items`);
  
  try {
    // Process the batch with the LLM using the extracted module
    const debugDir = path.join(OUTPUT_DIR, 'debug');
    const { enhancedItems, response } = await processWithLLM<SimplifiedExiconItem>(items, debugDir);
    
    // Count how many items were successfully processed with their own data (not defaults)
    const properlyProcessed = enhancedItems.filter(item => 
      item.aliases.length > 0 || item.tags.length > 0 || item.confidence > 0
    );
    
    console.log(`✅ Successfully processed ${properlyProcessed.length}/${items.length} items`);
    
    return { 
      enhancedItems,
      response 
    };
  } catch (error) {
    console.error(`❌ Error in batch processing:`, error);
    
    // Return the original items with empty enhancements if there's an error
    return { 
      enhancedItems: items.map(item => ({
        ...item,
        ...DEFAULT_ENHANCEMENT_VALUES,
        external_id: item.external_id,
        urlSlug: item.urlSlug
      })) as EnhancedExiconItem[],
      response: { usage: null } 
    };
  }
}

// Function to save data to CSV with the enhanced fields
async function saveToCSV(items: EnhancedExiconItem[], filePath: string): Promise<void> {
  // Create CSV header
  const header = [
    'external_id',
    'name',
    'categories',
    'description',
    'aliases',
    'alias_ids',
    'tags',
    'confidence',
    'quality',
    'author',
    'difficulty',
    'text',
    'video_url',
    'urlSlug',
    'postURL'
  ].join(',');
  
  // Create CSV rows
  const rows = items.map(item => {
    // Escape fields that might contain commas
    const escapeCsvField = (field: string | null | string[] | number): string => {
      if (field === null) return '';
      if (typeof field === 'number') return String(field);
      if (Array.isArray(field)) {
        return `"${field.join('; ').replace(/"/g, '""')}"`;
      }
      // Replace double quotes with two double quotes and wrap in quotes if contains commas or quotes
      const escaped = String(field).replace(/"/g, '""');
      return (escaped.includes(',') || escaped.includes('"')) ? `"${escaped}"` : escaped;
    };
    
    // Format aliases for display
    let aliasNames = '';
    let aliasIds = '';
    
    if (item.aliases.length > 0) {
      const names: string[] = [];
      const ids: string[] = [];
      
      for (const alias of item.aliases) {
        names.push(alias.name);
        ids.push(alias.id);
      }
      
      aliasNames = names.join('; ');
      aliasIds = ids.join('; ');
    }
    
    return [
      escapeCsvField(item.external_id),
      escapeCsvField(item.name),
      escapeCsvField(item.categories),
      escapeCsvField(item.description),
      escapeCsvField(aliasNames),
      escapeCsvField(aliasIds),
      escapeCsvField(item.tags),
      escapeCsvField(item.confidence),
      escapeCsvField(item.quality),
      escapeCsvField(item.author),
      escapeCsvField(item.difficulty),
      escapeCsvField(item.text),
      escapeCsvField(item.video_url),
      escapeCsvField(item.urlSlug),
      escapeCsvField(item.postURL)
    ].join(',');
  });
  
  // Combine header and rows
  const csvContent = [header, ...rows].join('\n');
  
  // Write to file
  await fs.writeFile(filePath, csvContent, 'utf8');
}

// Main function to enhance all Exicon items in batches
async function enhanceExiconDataBatch(inputFilePath?: string, batchSize: number = 20): Promise<void> {
  try {
    const actualInputFile = inputFilePath || INPUT_FILE;
    
    console.log('Starting enhanceExiconDataBatch()');
    console.log(`Reading Exicon data from: ${actualInputFile}`);
    
    // Read the input JSON file
    const items: SimplifiedExiconItem[] = await fs.readJSON(actualInputFile);
    console.log(`Found ${items.length} items to enhance`);
    
    // Generate output filenames based on input filename
    const baseName = path.basename(actualInputFile, '.json');
    const outputJsonFile = path.join(OUTPUT_DIR, `${baseName}-batch-revised.json`);
    const outputCsvFile = path.join(OUTPUT_DIR, `${baseName}-batch-revised.csv`);
    
    // Process items with AI in batches
    const enhancedItems: EnhancedExiconItem[] = [];
    const totalItems = items.length;
    
    console.log(`Processing ${totalItems} items in API batches of ${batchSize}`);
    
    // Add token and timing tracking
    const startTime = Date.now();
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCost = 0;
    
    // GPT-4o pricing per 1000 tokens (as of May 2024)
    const PROMPT_TOKEN_COST_PER_1K = 0.005;
    const COMPLETION_TOKEN_COST_PER_1K = 0.015;
    
    // Process in chunks for API calls
    for (let i = 0; i < totalItems; i += batchSize) {
      const chunkNumber = Math.floor(i / batchSize) + 1;
      const totalChunks = Math.ceil(totalItems / batchSize);
      
      console.log(`\n--- Processing API batch ${chunkNumber}/${totalChunks} ---`);
      
      // Get the current batch of items
      const batchEnd = Math.min(i + batchSize, totalItems);
      const batchItems = items.slice(i, batchEnd);
      
      // Process the entire batch in a single API call
      console.log(`Sending ${batchItems.length} items to API in a single call`);
      const { enhancedItems: batchEnhancedItems, response } = await enhanceBatch(batchItems);
      
      // Track token usage from the response
      if (response.usage) {
        const { prompt_tokens, completion_tokens } = response.usage;
        totalPromptTokens += prompt_tokens;
        totalCompletionTokens += completion_tokens;
        
        // Calculate cost for this batch
        const promptCost = (prompt_tokens / 1000) * PROMPT_TOKEN_COST_PER_1K;
        const completionCost = (completion_tokens / 1000) * COMPLETION_TOKEN_COST_PER_1K;
        const batchCost = promptCost + completionCost;
        totalCost += batchCost;
        
        console.log(`Batch ${chunkNumber} token usage: ${prompt_tokens} prompt + ${completion_tokens} completion = ${prompt_tokens + completion_tokens} total tokens`);
        console.log(`Batch ${chunkNumber} estimated cost: $${batchCost.toFixed(4)}`);
      }
      
      // Add enhanced items to the result array
      enhancedItems.push(...batchEnhancedItems);
      
      // Log results
    //   console.log(`Batch ${chunkNumber} results:`);
    //   batchEnhancedItems.forEach((item, index) => {
    //     console.log(`[${i + index + 1}/${totalItems}] Enhanced: ${item.name}`);
        
    //     // Format aliases for display
    //     const aliasDisplay = item.aliases.length > 0 
    //       ? item.aliases.map(a => `${a.name} (${a.id})`).join(', ')
    //       : 'None';
        
    //     console.log(`  Aliases: ${aliasDisplay}`);
    //     console.log(`  Tags: ${item.tags.join(', ') || 'None'}`);
    //     console.log(`  Confidence: ${item.confidence}`);
    //   });
      
      // Save progress after each batch
      console.log(`\nSaving progress after batch ${chunkNumber}/${totalChunks}`);
      await fs.writeJSON(outputJsonFile, enhancedItems, { spaces: 2 });
      await saveToCSV(enhancedItems, outputCsvFile);
      
      // Wait between batches to avoid rate limits
      if (chunkNumber < totalChunks) {
        console.log(` seconds before starting next batch...`);
        await setTimeout(2000);
      }
    }
    
    console.log('\nCompleted enhancing Exicon data in batches!');
    console.log(`Processed ${enhancedItems.length} items`);
    console.log(`Enhanced data saved to: ${outputJsonFile}`);
    console.log(`CSV data saved to: ${outputCsvFile}`);
    
    // Add usage summary
    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalTokens = totalPromptTokens + totalCompletionTokens;
    
    console.log('\n===== USAGE SUMMARY =====');
    console.log(`Total time: ${totalSeconds} seconds`);
    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`  - Prompt tokens: ${totalPromptTokens.toLocaleString()}`);
    console.log(`  - Completion tokens: ${totalCompletionTokens.toLocaleString()}`);
    console.log(`Estimated cost: $${totalCost.toFixed(4)}`);
    console.log('=========================');
  } catch (error) {
    console.error('Error in enhanceExiconDataBatch:', error);
  }
}

// Execute the main function if this file is run directly
if (require.main === module) {
  enhanceExiconDataBatch().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default enhanceExiconDataBatch; 