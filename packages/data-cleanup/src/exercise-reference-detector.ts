import OpenAI from 'openai';
import { DatabaseManager } from './database.js';
import { Exercise } from './types.js';
import { config } from './config.js';

export interface ExerciseReference {
  text: string;        // The text that mentions the exercise
  exerciseSlug: string; // The slug of the referenced exercise
  exerciseName: string; // The canonical name of the referenced exercise
  startIndex: number;   // Position in the original text
  endIndex: number;     // End position in the original text
  confidence: number;   // AI confidence in this match (0-1)
}

export interface ExerciseReferenceResult {
  exerciseId: string;
  originalText: string;
  references: ExerciseReference[];
  updatedText: string; // Text with markdown-style references
  confidence: number;
}

export class ExerciseReferenceDetector {
  private openai: OpenAI;
  private db: DatabaseManager;
  private exerciseDatabase: Map<string, Exercise> = new Map();
  private aliasMap: Map<string, string> = new Map(); // alias -> canonical slug

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.db = new DatabaseManager();
  }

  async initialize(): Promise<void> {
    await this.db.connect();
    await this.buildExerciseDatabase();
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }

  /**
   * Build a searchable database of all exercises and their aliases
   */
  private async buildExerciseDatabase(): Promise<void> {
    console.log('🏗️  Building exercise database for reference detection...');
    
    const exercises = await this.db.getAllExercises();
    
    for (const exercise of exercises) {
      const slug = this.generateSlug(exercise.name);
      this.exerciseDatabase.set(slug, exercise);
      
      // Add primary name
      this.aliasMap.set(exercise.name.toLowerCase(), slug);
      this.aliasMap.set(slug, slug);
      
      // Generate common variations/aliases
      const aliases = this.generateAliases(exercise.name);
      for (const alias of aliases) {
        this.aliasMap.set(alias.toLowerCase(), slug);
      }
    }
    
    console.log(`📚 Built database with ${exercises.length} exercises and ${this.aliasMap.size} aliases`);
  }

  /**
   * Generate a URL-friendly slug from exercise name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single
  }

  /**
   * Generate common aliases for an exercise name
   */
  private generateAliases(name: string): string[] {
    const aliases: string[] = [];
    
    // Add variations
    aliases.push(name.replace(/\s+/g, '')); // No spaces: "Man Maker" -> "manmaker"
    aliases.push(name.replace(/\s+/g, '-')); // Hyphenated: "Man Maker" -> "man-maker"
    aliases.push(name.replace(/\s+/g, '_')); // Underscored: "Man Maker" -> "man_maker"
    
    // Add singular/plural variations
    if (name.endsWith('s') && name.length > 3) {
      aliases.push(name.slice(0, -1)); // Remove trailing 's'
    } else {
      aliases.push(name + 's'); // Add trailing 's'
    }
    
    // Add common abbreviations for F3 terminology
    const f3Abbreviations: Record<string, string[]> = {
      'merkin': ['merkin', 'merkins'],
      'burpee': ['burpee', 'burpees'],
      'squat': ['squat', 'squats'],
      'plank': ['plank', 'planks'],
      'lunge': ['lunge', 'lunges'],
      'crunch': ['crunch', 'crunches'],
    };
    
    const lowerName = name.toLowerCase();
    for (const [key, variations] of Object.entries(f3Abbreviations)) {
      if (lowerName.includes(key)) {
        aliases.push(...variations);
      }
    }
    
    return [...new Set(aliases)]; // Remove duplicates
  }

  /**
   * Detect exercise references in a single exercise's text
   */
  async detectReferences(exercise: Exercise): Promise<ExerciseReferenceResult | null> {
    const textToAnalyze = exercise.description || exercise.text || '';
    
    if (!textToAnalyze.trim()) {
      return null;
    }

    try {
      // Get list of all exercise names for the AI prompt - focus on common/popular ones
      const exerciseNames = Array.from(this.exerciseDatabase.values())
        .map(ex => ex.name)
        .sort()
        .slice(0, 200); // Increase limit for better coverage

      const prompt = `You are an expert F3 workout analyst. Analyze the following exercise description and identify any mentions of OTHER exercises.

EXERCISE DATABASE (sample):
${exerciseNames.join(', ')}

EXERCISE TO ANALYZE:
Name: "${exercise.name}"
Text: "${textToAnalyze}"

TASK:
1. Identify any mentions of OTHER exercises (not the current exercise "${exercise.name}")
2. For each mention, provide the EXACT text span and the EXACT character positions
3. Match exercise names case-insensitively and look for partial matches

IMPORTANT MATCHING RULES:
- "merkin" or "merkins" = "Merkin" exercise
- "burpee" or "burpees" = "Burpee" exercise (not compound exercises like "Bear Crawl Burpees")
- "man maker" = "Man Maker" exercise
- "squat thruster" = "Squat Thruster" exercise
- Look for EXACT substring matches in the text
- Calculate positions based on the original text string

EXAMPLE:
Text: "Do 10 burpees then merkins"
Should find:
- "burpees" at positions where it appears
- "merkins" at positions where it appears

Return JSON format (NO markdown formatting):
{
  "references": [
    {
      "text": "exact text span from original",
      "exerciseName": "Exact Exercise Name",
      "startIndex": 0,
      "endIndex": 10,
      "confidence": 0.9
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
        throw new Error('No response content');
      }

      // Clean up the content to extract JSON from markdown code blocks
      let jsonContent = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const result = JSON.parse(jsonContent);
      
      // Process and validate references
      const processedReferences: ExerciseReference[] = [];
      
      for (const ref of result.references || []) {
        const slug = this.findExerciseSlug(ref.exerciseName);
        if (slug && this.exerciseDatabase.has(slug)) {
          processedReferences.push({
            text: ref.text,
            exerciseSlug: slug,
            exerciseName: this.exerciseDatabase.get(slug)!.name,
            startIndex: ref.startIndex,
            endIndex: ref.endIndex,
            confidence: ref.confidence,
          });
        }
      }

      // Generate updated text with markdown references
      const updatedText = this.generateMarkdownReferences(textToAnalyze, processedReferences);

      return {
        exerciseId: exercise._id,
        originalText: textToAnalyze,
        references: processedReferences,
        updatedText,
        confidence: processedReferences.length > 0 ? 
          processedReferences.reduce((sum, ref) => sum + ref.confidence, 0) / processedReferences.length : 1.0,
      };

    } catch (error) {
      console.error(`Error detecting references for ${exercise.name}:`, error);
      return null;
    }
  }

  /**
   * Find exercise slug by name or alias
   */
  private findExerciseSlug(exerciseName: string): string | undefined {
    const lowerName = exerciseName.toLowerCase();
    
    // Try exact match first
    const directSlug = this.aliasMap.get(lowerName);
    if (directSlug) {
      return directSlug;
    }

    // Special mappings for common F3 terms
    const specialMappings: Record<string, string> = {
      'merkin': 'merkin',
      'merkins': 'merkin', 
      'burpee': 'burpee',
      'burpees': 'burpee',
      'man maker': 'man-maker',
      'manmaker': 'man-maker',
      'squat thruster': 'squat-thruster',
      'squatthruster': 'squat-thruster',
      'hand release merkin': 'hand-release-merkin',
      'hand release merkins': 'hand-release-merkin',
      'handrelease merkin': 'hand-release-merkin',
      'handrelease merkins': 'hand-release-merkin'
    };
    
    if (specialMappings[lowerName]) {
      return specialMappings[lowerName];
    }

    // Try fuzzy matching as last resort
    const normalized = lowerName.replace(/[^a-z0-9]/g, '');
    for (const [alias, slug] of this.aliasMap.entries()) {
      const normalizedAlias = alias.replace(/[^a-z0-9]/g, '');
      if (normalizedAlias === normalized) {
        return slug;
      }
    }

    return undefined;
  }

  /**
   * Generate markdown-style references in text
   */
  private generateMarkdownReferences(originalText: string, references: ExerciseReference[]): string {
    if (references.length === 0) {
      return originalText;
    }

    // Validate and fix reference positions
    const validReferences = references.filter(ref => {
      const actualText = originalText.substring(ref.startIndex, ref.endIndex);
      if (actualText.toLowerCase() !== ref.text.toLowerCase()) {
        console.warn(`Position mismatch for "${ref.text}": expected at ${ref.startIndex}-${ref.endIndex}, found "${actualText}"`);
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
      // Double-check the text at this position
      const actualText = updatedText.substring(ref.startIndex, ref.endIndex);
      if (actualText.toLowerCase() === ref.text.toLowerCase()) {
        const before = updatedText.substring(0, ref.startIndex);
        const after = updatedText.substring(ref.endIndex);
        const markdownRef = `[${ref.text}](@${ref.exerciseSlug})`;
        
        updatedText = before + markdownRef + after;
        console.log(`✅ Replaced "${ref.text}" with "${markdownRef}"`);
      } else {
        console.warn(`❌ Skipping "${ref.text}" - text mismatch at position ${ref.startIndex}-${ref.endIndex}`);
      }
    }

    return updatedText;
  }

  /**
   * Process exercises in batches to detect references
   */
  async detectReferencesInBatch(batchSize: number = 10): Promise<ExerciseReferenceResult[]> {
    const exercises = await this.db.getAllExercises();
    const results: ExerciseReferenceResult[] = [];
    
    console.log(`🔍 Processing ${exercises.length} exercises for reference detection...`);
    
    for (let i = 0; i < exercises.length; i += batchSize) {
      const batch = exercises.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(exercises.length / batchSize)}...`);
      
      const batchPromises = batch.map(exercise => this.detectReferences(exercise));
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        if (result && result.references.length > 0) {
          results.push(result);
        }
      }
      
      // Rate limiting
      if (i + batchSize < exercises.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  /**
   * Get exercises that need reference processing
   */
  async getExercisesForReferenceDetection(): Promise<Exercise[]> {
    const collection = await this.db.getCollection();
    
    // Get exercises that have description or text but no referencedExercises field
    const exercises = await collection.find({
      $and: [
        {
          $or: [
            { description: { $exists: true, $ne: '' } },
            { text: { $exists: true, $ne: '' } }
          ]
        },
        {
          referencedExercises: { $exists: false }
        }
      ]
    }).toArray();
    
    return exercises as Exercise[];
  }
}