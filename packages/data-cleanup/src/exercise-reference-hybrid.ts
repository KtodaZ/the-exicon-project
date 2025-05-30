import OpenAI from 'openai';
import { DatabaseManager } from './database.js';
import { Exercise } from './types.js';
import { config } from './config.js';

export interface ExerciseReference {
  originalText: string;     // The text found by AI (e.g., "man maker")
  matchedExercise: Exercise; // The exercise found by search API
  similarity: number;       // Similarity score (0-1)
  startIndex: number;       // Position in original text
  endIndex: number;         // End position in original text
  slug: string;            // Generated slug for linking
}

export interface ExerciseReferenceResult {
  exerciseId: string;
  originalText: string;
  references: ExerciseReference[];
  updatedText: string;     // Text with markdown-style references
  confidence: number;      // Overall confidence in the results
  targetField: 'description' | 'text'; // Which field was processed
}

export class ExerciseReferenceHybrid {
  private openai: OpenAI;
  private db: DatabaseManager;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.db = new DatabaseManager();
  }

  async initialize(): Promise<void> {
    await this.db.connect();
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }

  /**
   * Process an exercise to find and validate references using AI + Search API
   * @param exercise The exercise to process
   * @param targetField Which field to process and update ('description' or 'text')
   */
  async processExercise(exercise: Exercise, targetField: 'description' | 'text' = 'description'): Promise<ExerciseReferenceResult | null> {
    const textToAnalyze = targetField === 'text' ? exercise.text || '' : exercise.description || exercise.text || '';

    if (!textToAnalyze.trim()) {
      return null;
    }

    console.log(`🔍 Processing ${targetField}: ${exercise.name}`);

    try {
      // Step 1: Use AI to detect potential exercise mentions
      const aiMentions = await this.detectWithAI(textToAnalyze, exercise.name);

      if (aiMentions.length === 0) {
        console.log(`  ⚪ AI found no potential exercise mentions`);
        return null;
      }

      console.log(`  🤖 AI found ${aiMentions.length} potential mentions:`, aiMentions.map(m => m.text));

      // Step 2: Validate each mention using the search API
      const validatedReferences: ExerciseReference[] = [];

      for (const mention of aiMentions) {
        console.log(`    🔍 Searching for: "${mention.text}"`);

        const searchResults = await this.searchExercises(mention.text);

        if (searchResults.length === 0) {
          console.log(`      ❌ No search results found`);
          continue;
        }

        const topResult = searchResults[0];
        const similarity = this.calculateSimilarity(mention.text, topResult.name);

        console.log(`      📊 Top result: "${topResult.name}" (similarity: ${(similarity * 100).toFixed(1)}%)`);

        // Only accept if similarity is 80% or higher
        if (similarity >= 0.8) {
          const slug = topResult.urlSlug || this.generateSlug(topResult.name);

          // Find the actual position of this text in the original string
          const position = this.findTextPosition(textToAnalyze, mention.text);

          validatedReferences.push({
            originalText: mention.text,
            matchedExercise: topResult,
            similarity,
            startIndex: position.startIndex,
            endIndex: position.endIndex,
            slug
          });

          console.log(`      ✅ Validated: "${mention.text}" → ${topResult.name}`);
        } else {
          console.log(`      ❌ Similarity too low (${(similarity * 100).toFixed(1)}% < 80%)`);
        }
      }

      if (validatedReferences.length === 0) {
        console.log(`  ⚪ No references met the 80% similarity threshold`);
        return null;
      }

      // Step 3: Generate markdown references
      const updatedText = this.generateMarkdownReferences(textToAnalyze, validatedReferences);
      const confidence = validatedReferences.reduce((sum, ref) => sum + ref.similarity, 0) / validatedReferences.length;

      console.log(`  ✅ Created ${validatedReferences.length} validated references`);

      return {
        exerciseId: exercise._id,
        originalText: textToAnalyze,
        references: validatedReferences,
        updatedText,
        confidence,
        targetField // Add the target field to the result
      };

    } catch (error) {
      console.error(`  ❌ Error processing ${exercise.name}:`, error);
      return null;
    }
  }

  /**
   * Use AI to detect potential exercise mentions in text
   */
  private async detectWithAI(text: string, currentExerciseName: string): Promise<Array<{ text: string }>> {
    const prompt = `You are an expert F3 workout analyst. Analyze the following exercise description and identify any mentions of OTHER exercises.

COMMON F3 EXERCISES (examples):
- Murder Bunny/Murder Bunnies: hop forward with block
- Merkin/Merkins: push up (derkin = decline pushup)  
- Burpee/Burpees: squat thrust with jump
- Man Maker: complex movement with weights
- Squat Thruster: squat to overhead press
- Hand Release Merkin: pushup with hand lift
- Clap-Merkin: pushup with clap
- Clurpee: burpee variation
- Dora: partner routine
- 11s: ladder exercise
- Al Gore: holding squat
- SSH/Side Straddle Hop: jumping jack
- Tuck Jump: jump bringing knees to chest
- Bear Crawl: crawling on hands and feet
- Mountain Climber: plank with alternating knees
- Flutter Kick: leg raises lying down
- 6 Minutes of Marys: abs routine
- Carolina dry dock: push ups with butt high in air

EXERCISE TO ANALYZE:
Name: "${currentExerciseName}"
Text: "${text}"

TASK:
1. Look for the exercise names from the examples above or similar F3 exercises
2. Return ONLY the exercise name text (we'll find positions ourselves)
3. Include singular/plural variations (merkin: merkin, merkins, burpee: burpee, burpees, Carolina Dry dock: Carolina Dry dock, Carolina Dry Docks, lunge, lunges, Box Jump, Box Jumps)

IMPORTANT:
- Look for complete exercise names that match F3 terminology
- Return the EXACT text as it appears (keep original case/spelling)

Return JSON format (NO markdown formatting):
{
  "mentions": [
    {
      "text": "exact exercise name as found in text"
    }
  ]
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from AI');
    }

    // Clean up JSON from potential markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonContent);
    return result.mentions || [];
  }

  /**
   * Search for exercises using the same logic as the frontend
   * This mimics the searchExercisesWithAtlas function from the web app
   */
  private async searchExercises(query: string): Promise<Exercise[]> {
    const collection = this.db.getExercisesCollection();

    try {
      // Use exact Atlas Search implementation from the main app
      const shouldClauses = [
        {
          text: {
            query: query.trim(),
            path: ["name"],
            // Add fuzzy matching to handle typos and variations
            fuzzy: {
              // For short words (<=5 chars), allow 1 typo
              // For longer words, allow up to 2 typos
              maxEdits: query.trim().length <= 5 ? 1 : 2,
              // Require first character to match exactly
              prefixLength: 1,
              // Maximum variations to try (higher = more thorough but slower)
              maxExpansions: 50,
            },
            // Boost name matches higher than other fields
            score: { boost: { value: 5.0 } }
          }
        },
        {
          text: {
            query: query.trim(),
            path: ["aliases.name"],
            // Use same settings as name field since aliases are also exercise names
            fuzzy: {
              maxEdits: query.trim().length <= 5 ? 1 : 2,
              prefixLength: 1,
              maxExpansions: 50,
            },
            score: { boost: { value: 5.0 } }
          }
        },
        {
          text: {
            query: query.trim(),
            path: ["description"],
            score: { boost: { value: 1.0 } }
          }
        },
        {
          text: {
            query: query.trim(),
            path: ["text"],
            fuzzy: {
              // For short words (<=5 chars), allow 1 typo/edit
              // For longer words, allow up to 2 typos/edits
              maxEdits: query.trim().length <= 5 ? 1 : 2,

              // Require the first character to match exactly
              prefixLength: 1,

              // Maximum number of variations to generate
              // Higher = more thorough but slower search
              maxExpansions: 50
            },
            score: { boost: { value: 1.0 } }
          }
        },
        {
          text: {
            query: query.trim(),
            path: ["tags"],
            score: { boost: { value: 1.0 } }
          }
        }
      ];

      const searchPipeline = [
        {
          $search: {
            index: "default",
            compound: {
              should: shouldClauses,
              minimumShouldMatch: 1
            }
          }
        },
        {
          $addFields: {
            score: { $meta: "searchScore" }
          }
        },
        {
          $sort: { score: -1 }
        },
        {
          $limit: 10
        }
      ];

      const exercises = await collection.aggregate(searchPipeline).toArray();

      if (exercises.length > 0) {
        console.log(`      🔍 Atlas Search found ${exercises.length} results`);
        return exercises as Exercise[];
      }
    } catch (error) {
      console.log(`      ⚠️  Atlas Search error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`      📋 Falling back to regex search...`);
    }

    // Fallback to regex search with better scoring
    console.log(`      🔍 Regex search for: "${query}"`);
    const regexQuery = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // First try exact name matches
    let exercises = await collection.find({
      name: regexQuery
    })
      .sort({ name: 1 })
      .limit(10)
      .toArray();

    console.log(`      📊 Name search found ${exercises.length} results`);

    // If no name matches, search other fields
    if (exercises.length === 0) {
      exercises = await collection.find({
        $or: [
          { description: regexQuery },
          { text: regexQuery },
          { tags: { $in: [regexQuery] } }
        ]
      })
        .sort({ name: 1 })
        .limit(10)
        .toArray();

      console.log(`      📊 Full-text search found ${exercises.length} results`);
    }

    // Show what we found
    if (exercises.length > 0) {
      console.log(`      📋 Top results: ${exercises.slice(0, 3).map(e => e.name).join(', ')}`);
    }

    return exercises as Exercise[];
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate markdown-style references in text
   */
  private generateMarkdownReferences(originalText: string, references: ExerciseReference[]): string {
    if (references.length === 0) {
      return originalText;
    }

    // Validate reference positions
    const validReferences = references.filter(ref => {
      const actualText = originalText.substring(ref.startIndex, ref.endIndex);
      if (actualText.toLowerCase() !== ref.originalText.toLowerCase()) {
        console.warn(`Position mismatch for "${ref.originalText}": expected at ${ref.startIndex}-${ref.endIndex}, found "${actualText}"`);
        return false;
      }
      return true;
    });

    if (validReferences.length === 0) {
      console.warn('No valid references after position validation');
      return originalText;
    }

    // Sort references by start index (descending) to avoid position shifts
    const sortedRefs = validReferences.sort((a, b) => b.startIndex - a.startIndex);

    let updatedText = originalText;

    for (const ref of sortedRefs) {
      const before = updatedText.substring(0, ref.startIndex);
      const after = updatedText.substring(ref.endIndex);
      const markdownRef = `[${ref.originalText}](@${ref.slug})`;

      updatedText = before + markdownRef + after;
      console.log(`    🔗 Replaced "${ref.originalText}" with "${markdownRef}"`);
    }

    return updatedText;
  }

  /**
   * Find the position of text in the original string
   */
  private findTextPosition(originalText: string, searchText: string): { startIndex: number, endIndex: number } {
    const lowerOriginal = originalText.toLowerCase();
    const lowerSearch = searchText.toLowerCase();

    const startIndex = lowerOriginal.indexOf(lowerSearch);
    if (startIndex === -1) {
      console.warn(`Could not find "${searchText}" in original text`);
      return { startIndex: 0, endIndex: searchText.length };
    }

    return {
      startIndex,
      endIndex: startIndex + searchText.length
    };
  }

  /**
   * Generate URL-friendly slug from exercise name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single
  }
}