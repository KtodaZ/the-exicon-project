import { OpenAI } from 'openai';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { parseToolCallArguments } from './jsonParser';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// File paths
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');

/**
 * Interfaces for LLM processing
 */
export interface AliasObject {
  name: string;
  id: string;
}

export interface EnhancementResult {
  external_id: string;
  urlSlug: string;
  aliases: AliasObject[];
  tags: string[];
  confidence: number;
  quality: number;
  author: string;
  time: number;
  difficulty: number;
}

export interface BatchAliasResult {
  results: EnhancementResult[];
}

/**
 * Default values for enhanced items when no results are found
 */
export const DEFAULT_ENHANCEMENT_VALUES: Omit<EnhancementResult, 'external_id' | 'urlSlug'> = {
  aliases: [],
  tags: [],
  confidence: 0,
  quality: 0,
  difficulty: 0,
  time: 1,
  author: 'N/A',
};

/**
 * Creates the system and user prompts for the LLM with enhanced instructions
 */
function createPrompts(exercises: any[]) {
  // Extract exercise IDs for verification
  const exerciseIds = exercises.map(ex => ex.id);
  
  // Create enumerated list of exercise IDs for explicit instruction
  const exerciseIdsList = exerciseIds.map((id, index) => 
    `  ${index + 1}. ID: "${id}" - ${exercises[index].name}`
  ).join('\n');
  
  return [
    {
      role: "system" as const,
      content: `You are a precise metadata extraction assistant. Your task is to analyze ${exercises.length} exercises and extract structured metadata for EACH ONE WITHOUT EXCEPTION. 
You must return EXACTLY ${exercises.length} results, with each result corresponding to one input exercise.
Never skip any exercise or return fewer than ${exercises.length} results.`
    },
    {
      role: "user" as const,
      content: `
I need you to analyze a batch of exactly ${exercises.length} exercises and extract metadata for EACH ONE. 

This batch contains the following ${exercises.length} exercises that ALL need processing:
${exerciseIdsList}

For EACH of these ${exercises.length} exercises, I need you to extract:

1. Aliases:
   - Find all possible aliases for each exercise
   - Look for terms after "aka" or phrases like "also called", "sometimes called", etc.
   - For each alias, provide both a display name and a kebab-case identifier
   - The display name should be the original alias text
   - The identifier should be lowercase with hyphens instead of spaces

   Examples:
   "Wooly Worm aka Inch Worm" → [{"name": "Wooly Worm", "id": "wooly-worm"}, {"name": "Inch Worm", "id": "inch-worm"}]
   "The Swimmer" → [{"name": "Swimmer", "id": "swimmer"}]

2. Tags:
   Determine the tags for each exercise. Possible tags are:
   - upper-body
   - shoulders
   - chest
   - triceps
   - lower-body
   - glutes
   - squats
   - calves
   - lunges
   - core
   - plank
   - full-body
   - burpee
   - merkin
   - crawl
   - flexibility (involving a stretch)
   - endurance (e.g. cardio)
   - sprints
   - run
   - plyometrics
   - hill
   - stairs
   - routine (consisting of multiple exercises in one)
   - base-routine (a routine that can be used to design a workout, e.g. 11s, Dora, etc)
   - partner (involves 1 or 2 partners, not a group)
   - coupon (a coupon is a weight like a block)
   - bench (involves a bench or platform or box)
   - pull-up-bar
   - playground-swing
   - water
   - timer
   - music (involves music)
   - field
   - parking-lot
   - playground
   - track
   - game
   - jump

3. Additional Metadata:
   confidence: Assign a confidence score between 0 and 1 for determining the accuracy of the tags.
   quality: Assign a quality score between 0 and 1 for determining the quality of the description.
   difficulty: Assign a difficulty score between 0 and 1 for determining the difficulty of the exercise.
   time: Estimated time in minutes to complete the exercise / routine. Keep in mind a typical F3 workout is 45-60 minutes and most exercises are well under that.
   author: If the description contains an explicit "author" or "submitted by" reference, use that. Otherwise "N/A".
   
Some basic definitions that may help determine the tags:
- Murder Bunny: bending over with hands on the block, hop forward, and once landed pick up the block and move it as far forward as you can reach, then repeat
- Merkin: push up (derkin - decline pushup)
- Dora: A routine involving a partner where you must perform a specifc number of reps of an exercise together
- 11s: A ladder exercise in which you start with 1 rep of one exercise and 10 reps of another exercise, then add one additional rep to the first exercise and subtract one rep from the second
- 6 Minutes of Marys: abs routine
- al gore: holding a squat
- SSH / side stradel hop: jumping jack

Here are all ${exercises.length} exercises to analyze - YOU MUST PROCESS EACH ONE:
${JSON.stringify(exercises, null, 2)}

CRITICAL REQUIREMENTS:
1. You MUST return EXACTLY ${exercises.length} results - one for EACH exercise.
2. Set count_verification to exactly ${exercises.length} to confirm you processed all exercises.
3. Each result MUST have an external_id matching one of the original exercise IDs.
4. Never omit any exercise - process ALL ${exercises.length} exercises.
5. Double-check your results count before responding.

Your response MUST include results for these specific ${exercises.length} IDs:
${JSON.stringify(exerciseIds)}
      `
    }
  ];
}

/**
 * Creates the tool schema for LLM function calling with enhanced validation
 */
function createToolSchema(itemsLength: number) {
  // Create an array of expected IDs to ensure all items are processed
  return [
    {
      type: "function" as const,
      function: {
        name: "processBatchExercises",
        description: `Process a batch of ${itemsLength} exercises and extract metadata. You MUST return exactly ${itemsLength} results.`,
        parameters: {
          type: "object",
          properties: {
            count_verification: {
              type: "integer",
              description: `MUST be exactly ${itemsLength}. This is a validation check to ensure you processed all items.`,
              minimum: itemsLength,
              maximum: itemsLength
            },
            results: {
              type: "array",
              description: `Results array MUST contain EXACTLY ${itemsLength} entries - one for each input exercise, no more, no less.`,
              minItems: itemsLength,
              maxItems: itemsLength,
              items: {
                type: "object",
                properties: {
                  external_id: {
                    type: "string", 
                    description: "ID of the exercise to match with input. This MUST match one of the input exercise IDs."
                  },
                  urlSlug: {
                    type: "string",
                    description: "URL slug of the exercise to match with input"
                  },
                  aliases: {
                    type: "array",
                    description: "Array of alias objects with display name and identifier",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "Display name for the alias"
                        },
                        id: {
                          type: "string", 
                          description: "Identifier in kebab-case format"
                        }
                      },
                      required: ["name", "id"]
                    }
                  },
                  tags: {
                    type: "array",
                    description: "Array of tags for the exercise",
                    items: { type: "string" }
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0 and 1",
                    minimum: 0,
                    maximum: 1
                  },
                  quality: {
                    type: "number",
                    description: "Quality score between 0 and 1",
                    minimum: 0,
                    maximum: 1
                  },
                  difficulty: {
                    type: "number",
                    description: "Difficulty score between 0 and 1",
                    minimum: 0,
                    maximum: 1
                  },
                  time: {
                    type: "number",
                    description: "Estimated time in minutes to complete the exercise",
                    minimum: 0
                  },
                  author: {
                    type: "string",
                    description: "Author of the exercise if mentioned"
                  }
                },
                required: ["external_id", "urlSlug", "aliases", "tags", "confidence", "quality", "difficulty", "time", "author"]
              }
            }
          },
          required: ["count_verification", "results"]
        }
      }
    }
  ];
}

/**
 * Process the batch using LLM and return enhanced items
 * @param items The items to process
 * @param debugDir Directory to save debug logs
 * @returns Enhanced items and API response
 */
export async function processWithLLM<T extends { external_id: string; urlSlug: string; name: string; description?: string; text?: string }>(
  items: T[],
  debugDir: string = path.join(OUTPUT_DIR, 'debug')
): Promise<{ enhancedItems: (T & EnhancementResult)[], response: any }> {
  try {
    console.log(`Enhancing batch of ${items.length} items`);
    
    // Create debug directory if it doesn't exist
    await fs.ensureDir(debugDir);
    
    // Prepare the batch data structure
    const exercises = items.map(item => ({
      id: item.external_id,
      urlSlug: item.urlSlug,
      name: item.name,
      text: item.text || ''
    }));
    
    // Log the request payload for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const requestLogFile = path.join(debugDir, `request-${timestamp}.json`);
    
    // Create messages and tools
    const messages = createPrompts(exercises);
    const tools = createToolSchema(items.length);
    
    const requestPayload = {
      model: "o4-mini",
    //   temperature: 0.1,
      messages,
      tools,
    //   max_tokens: 10000 // Large enough for batch processing
    };
    
    // Log the request payload
    await fs.writeJSON(requestLogFile, requestPayload, { spaces: 2 });
    console.log(`Request payload logged to: ${requestLogFile}`);
    
    // Make API call
    const response = await openai.chat.completions.create(requestPayload);
    
    // Log the response for debugging
    const responseLogFile = path.join(debugDir, `response-${timestamp}.json`);
    await fs.writeJSON(responseLogFile, response, { spaces: 2 });
    console.log(`Response logged to: ${responseLogFile}`);
    
    // Extract results from response
    const result = extractResultsFromResponse(response, items.length);
    
    // Log the parsed combined result
    const parsedResultLogFile = path.join(debugDir, `parsed-result-${timestamp}.json`);
    await fs.writeJSON(parsedResultLogFile, result, { spaces: 2 });
    console.log(`Parsed combined result logged to: ${parsedResultLogFile}`);
    
    // Ensure all items have results by filling in missing ones
    const finalResult = ensureAllItemsHaveResults(items, result);
    
    // Map the results back to the original items
    const enhancedItems = mapResultsToItems(items, finalResult);
    
    // Track token usage from the response
    logTokenUsage(response);
    
    // Return both the enhanced items and the response for token tracking
    return { 
      enhancedItems: enhancedItems as (T & EnhancementResult)[],
      response 
    };
  } catch (error) {
    console.error(`Error processing with LLM:`, error);
    // Return the original items with empty enhancements if there's an error
    return { 
      enhancedItems: items.map(item => ({
        ...item,
        ...DEFAULT_ENHANCEMENT_VALUES,
        external_id: item.external_id,
        urlSlug: item.urlSlug
      })) as (T & EnhancementResult)[],
      response: { usage: null } 
    };
  }
}

/**
 * Extract results from OpenAI response with count verification
 */
function extractResultsFromResponse(response: any, expectedCount: number): BatchAliasResult {
  // Extract all tool calls from the response
  const toolCalls = response.choices[0]?.message?.tool_calls || [];
  let result: BatchAliasResult = { results: [] };
  
  console.log(`Found ${toolCalls.length} tool calls in the response`);
  
  // Process each tool call and combine results
  for (const call of toolCalls) {
    if (call.function && call.function.name === 'processBatchExercises') {
      try {
        // Log the raw arguments for debugging
        const argsLength = call.function.arguments ? call.function.arguments.length : 0;
        console.log(`Processing tool call with arguments length: ${argsLength} characters`);
        
        // Check for truncation and parse JSON
        const finishReason = response.choices[0]?.finish_reason;
        const parsed = parseToolCallArguments(call.function.arguments, finishReason);
        
        if (parsed) {
          // Verify count_verification field matches expected count
          if (parsed.count_verification !== undefined) {
            const countVerification = parsed.count_verification;
            console.log(`Count verification value: ${countVerification}, Expected: ${expectedCount}`);
            
            if (countVerification !== expectedCount) {
              console.warn(`⚠️ Count verification mismatch! Got ${countVerification}, expected ${expectedCount}`);
            }
          } else {
            console.warn(`⚠️ No count_verification field found in response`);
          }
          
          const callResult = parsed as BatchAliasResult;
          if (callResult.results && Array.isArray(callResult.results)) {
            // Check if we got the expected number of results
            if (callResult.results.length !== expectedCount) {
              console.warn(`⚠️ Result count mismatch! Got ${callResult.results.length}, expected ${expectedCount}`);
              
              // Log the IDs we received to help with debugging
              const receivedIds = callResult.results.map(r => r.external_id).join(', ');
              console.log(`Received IDs: ${receivedIds}`);
            } else {
              console.log(`✅ Correct number of results received: ${callResult.results.length}`);
            }
            
            // Add results from this tool call to the combined results
            result.results = [...result.results, ...callResult.results];
            console.log(`Added ${callResult.results.length} results from tool call`);
          } else {
            console.warn(`⚠️ Tool call returned a response without a valid results array`);
          }
        }
      } catch (error) {
        console.error(`Error handling tool call:`, error);
        // Log a portion of the arguments for debugging
        if (call.function.arguments) {
          const preview = call.function.arguments.substring(0, 200) + '...';
          console.error(`Arguments preview: ${preview}`);
        }
      }
    }
  }
  
  // Final verification of combined results
  if (result.results.length !== expectedCount) {
    console.warn(`⚠️ FINAL COUNT MISMATCH: Got ${result.results.length} results, expected ${expectedCount}`);
    
    // Check for duplicates
    const idCounts = new Map<string, number>();
    for (const item of result.results) {
      const id = item.external_id;
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
    
    // Log any duplicates
    const duplicates = Array.from(idCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => `${id} (${count} times)`);
      
    if (duplicates.length > 0) {
      console.warn(`⚠️ Found duplicate IDs: ${duplicates.join(', ')}`);
    }
  } else {
    console.log(`✅ FINAL VERIFICATION: Correct total of ${result.results.length} results`);
  }
  
  return result;
}

/**
 * Ensure all items have results by filling in missing ones
 */
function ensureAllItemsHaveResults<T extends { external_id: string; urlSlug: string; name?: string }>(
  items: T[], 
  result: BatchAliasResult
): BatchAliasResult {
  console.log(`Received ${result.results.length} results for ${items.length} items`);
  
  if (result.results.length < items.length) {
    console.warn('⚠️ Warning: Received fewer results than items in the batch!');
    
    // Log the missing items
    const itemIds = items.map(item => item.external_id);
    const resultIds = result.results.map(r => r.external_id);
    const missingIds = itemIds.filter(id => !resultIds.includes(id));
    
    console.warn(`Missing results for items: ${missingIds.join(', ')}`);
    
    // Add placeholder results for missing items
    for (const item of items) {
      if (!result.results.find(r => r.external_id === item.external_id)) {
        console.log(`Adding placeholder result for item: ${item.name || item.external_id} (${item.external_id})`);
        result.results.push({
          external_id: item.external_id,
          urlSlug: item.urlSlug,
          ...DEFAULT_ENHANCEMENT_VALUES
        });
      }
    }
  } else if (result.results.length === 0) {
    console.warn('⚠️ Warning: No results found in any tool calls!');
    
    // Create empty results for all items as fallback
    result.results = items.map(item => ({
      external_id: item.external_id,
      urlSlug: item.urlSlug,
      ...DEFAULT_ENHANCEMENT_VALUES
    }));
  }
  
  return result;
}

/**
 * Map results back to original items
 */
function mapResultsToItems<T extends { external_id: string }>(
  items: T[], 
  result: BatchAliasResult
): (T & EnhancementResult)[] {
  return items.map(item => {
    const enhancedResult = result.results.find(r => r.external_id === item.external_id);
    
    if (enhancedResult) {
      // Apply defaults for any missing values
      return {
        ...item,
        aliases: enhancedResult.aliases || DEFAULT_ENHANCEMENT_VALUES.aliases,
        tags: enhancedResult.tags || DEFAULT_ENHANCEMENT_VALUES.tags,
        confidence: enhancedResult.confidence || DEFAULT_ENHANCEMENT_VALUES.confidence,
        quality: enhancedResult.quality || DEFAULT_ENHANCEMENT_VALUES.quality,
        time: enhancedResult.time || DEFAULT_ENHANCEMENT_VALUES.time,
        difficulty: enhancedResult.difficulty || DEFAULT_ENHANCEMENT_VALUES.difficulty,
        author: enhancedResult.author || DEFAULT_ENHANCEMENT_VALUES.author,
        urlSlug: enhancedResult.urlSlug
      };
    }
    
    // Return original item with default values if no result was found
    console.warn(`No result found for item: ${item.external_id}`);
    return {
      ...item,
      ...DEFAULT_ENHANCEMENT_VALUES,
      urlSlug: (item as any).urlSlug || ''
    } as T & EnhancementResult;
  });
}

/**
 * Log token usage
 */
function logTokenUsage(response: any): void {
  if (response.usage) {
    const { prompt_tokens, completion_tokens } = response.usage;
    console.log(`Batch token usage: ${prompt_tokens} prompt + ${completion_tokens} completion = ${prompt_tokens + completion_tokens} total tokens`);
  }
}

/**
 * Calculate estimated cost based on token usage
 * @param promptTokens Number of prompt tokens
 * @param completionTokens Number of completion tokens
 * @param promptCostPer1k Cost per 1000 prompt tokens
 * @param completionCostPer1k Cost per 1000 completion tokens
 * @returns Estimated cost
 */
export function calculateCost(
  promptTokens: number, 
  completionTokens: number, 
  promptCostPer1k: number = 0.005, 
  completionCostPer1k: number = 0.015
): number {
  const promptCost = (promptTokens / 1000) * promptCostPer1k;
  const completionCost = (completionTokens / 1000) * completionCostPer1k;
  return promptCost + completionCost;
} 