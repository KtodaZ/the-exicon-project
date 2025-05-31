import OpenAI from 'openai';
import { config } from './config.js';
import { CleanupConfig, Exercise, LexiconItem } from './types.js';

export class OpenAIClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateCleanup(
    exercise: Exercise,
    cleanupConfig: CleanupConfig,
    sourceValue?: string
  ): Promise<{ value: string; reason: string; confidence: number }> {
    try {
      const contentToProcess = sourceValue || exercise[cleanupConfig.field as keyof Exercise];
      const currentValue = exercise[cleanupConfig.field as keyof Exercise];
      
      const systemPrompt = `You are a data cleanup specialist for a fitness exercise database. Your job is to improve and standardize data while preserving the original author's voice and intent.

Exercise Database Context:
- This is The Exicon Project, a community-driven exercise database for F3 workouts
- Exercises are created by F3 members (called PAX) across different regions
- F3 culture values authenticity, community, and preserving the spirit of contributions
- Many exercises have creative names and unique backstories that should be preserved

Your task: ${cleanupConfig.prompt}

IMPORTANT GUIDELINES:
1. Preserve the original author's voice and writing style
2. Keep F3-specific terminology and references intact
3. Maintain any humor, personality, or regional flavor in the content
4. Only suggest changes that genuinely improve clarity or readability
5. If the current content is already good, return it unchanged
6. Be conservative - when in doubt, don't change it

Response format (JSON only):
{
  "value": "improved content here",
  "reason": "brief explanation of changes made",
  "confidence": 0.8
}

If no improvement is needed, return:
{
  "value": "[original content]",
  "reason": "Content is already clear and well-written",
  "confidence": 1.0
}`;

      let userPrompt: string;
      
      if (cleanupConfig.field === 'description' && sourceValue) {
        userPrompt = `Exercise: "${exercise.name}"
Source text to summarize: "${contentToProcess}"
Current description: "${currentValue || 'None'}"

Please generate a concise description from the source text:`;
      } else if (cleanupConfig.field === 'tags') {
        userPrompt = `Exercise: "${exercise.name}"
Exercise text: "${contentToProcess}"
Current tags: ${currentValue ? JSON.stringify(currentValue) : '[]'}

Please analyze the exercise and generate appropriate tags:`;
      } else if (cleanupConfig.field === 'text') {
        userPrompt = `Exercise: "${exercise.name}"
Current text content: "${contentToProcess}"

Please improve the formatting of this text while preserving all original content:`;
      } else {
        userPrompt = `Exercise: "${exercise.name}"
Current ${cleanupConfig.field}: "${contentToProcess}"

Please review and improve if needed:`;
      }

      const response = await this.client.chat.completions.create({
        model: cleanupConfig.model || config.openai.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: cleanupConfig.maxTokens || config.openai.defaultMaxTokens,
        temperature: cleanupConfig.temperature || config.openai.defaultTemperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      
      // Validate response structure
      if (!parsed.value || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response format from OpenAI');
      }

      return {
        value: parsed.value,
        reason: parsed.reason || 'No reason provided',
        confidence: Math.min(Math.max(parsed.confidence, 0), 1) // Clamp between 0 and 1
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async generateLexiconCleanup(item: LexiconItem, field: string): Promise<any> {
    const fieldValue = (item as any)[field];
    if (!fieldValue) {
      throw new Error(`Field ${field} not found or empty in lexicon item`);
    }

    const prompt = `You are cleaning up lexicon descriptions for F3 (fitness/workout community). Your task is to:

1. REMOVE HTML tags, style attributes, and formatting elements
2. IMPROVE TEXT FORMATTING with appropriate line breaks and paragraph structure
3. PRESERVE all original words, spelling, capitalization, and punctuation EXACTLY

FORMATTING EXAMPLE:
Input: "An injury sustained during a BeatDown, or less heroically (as those of us in the 3rd 500 of life know) because we slept on it wrong. Inspired by often injured NHL hockey player Dustin Penner who famously & laughingly threw his back out while eating pancakes at the breakfast table with his wife. Ironic Adjunct: he ended up being traded to another team for a 4th round pick… on National Pancake Day."

Output: "An injury sustained during a BeatDown,
or less heroically (as those of us in the 3rd 500 of life know)
because we slept on it wrong.

Inspired by often injured NHL hockey player Dustin Penner,
who famously & laughingly threw his back out
while eating pancakes at the breakfast table with his wife.

Ironic Adjunct:
he ended up being traded to another team for a 4th round pick…
on National Pancake Day."

CRITICAL RULES:
- DO NOT change any words, spelling, or punctuation
- DO NOT fix grammar or capitalization 
- DO NOT change "BeatDown" to "beatdown" or similar
- DO NOT add or remove punctuation
- DO add appropriate line breaks for readability
- DO add blank lines between distinct thoughts/paragraphs
- Only fix HTML entity encoding (&nbsp; → space, &amp; → &, etc.)

Current text to clean:
${fieldValue}

Return the cleaned text with improved formatting:`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1
      });

      const cleanedText = response.choices[0].message.content?.trim();
      if (!cleanedText) {
        throw new Error('Empty response from OpenAI');
      }

      return { cleanedText };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async generateLexiconAliases(item: LexiconItem): Promise<any> {
    const prompt = `You are analyzing lexicon descriptions for F3 (fitness/workout community) to identify aliases or alternative names.

Your task is to find phrases that indicate alternative names for the term "${item.title}". Look for patterns like:
- "also known as"
- "aka" or "a.k.a."
- "sometimes called"
- "also called"
- "or simply"
- "alternatively"
- parenthetical references like "(also called X)"
- "referred to as"
- abbreviations that are spelled out: "HC" → "Hard Commit", "Here Count"

EXAMPLES:
Title: "Navy Seal Burpee"
Description: "The Navy Seal burpee (or Seal Burpee) is a standard burpee..."
Result: ["Seal Burpee"]

Title: "4E"  
Description: "The Fourth Estate consists of..."
Result: ["Fourth Estate"]

Title: "HC"
Description: "Hard Commit, also known as Here Count..."
Result: ["Hard Commit", "Here Count"]

RULES:
- Extract ONLY the alternative names mentioned in the text
- Do NOT include the main title unless it appears as a variant
- Include variations in capitalization, spelling, or abbreviations
- Keep the exact spelling and capitalization as found in the text
- Return an empty array if no aliases are found

Current lexicon term to analyze:
Title: "${item.title}"
Description: "${item.description}"

Return ONLY a valid JSON array (no markdown, no explanations):`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content?.trim();
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the JSON response - should be wrapped in an object due to json_object format
      let result: any;
      try {
        result = JSON.parse(content);
        
        // Extract aliases array from the response object
        let aliases: string[] = [];
        if (result.aliases && Array.isArray(result.aliases)) {
          aliases = result.aliases;
        } else if (Array.isArray(result)) {
          aliases = result;
        } else {
          // Try to find any array in the response
          const values = Object.values(result);
          const arrayValue = values.find(v => Array.isArray(v));
          if (arrayValue) {
            aliases = arrayValue as string[];
          }
        }
        
        // Convert to the required format with name and id
        const formattedAliases = aliases.map(alias => ({
          name: alias.trim(),
          id: this.generateSlug(alias.trim())
        }));

        return { aliases: formattedAliases };
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON:', content);
        return { aliases: [] };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async generateLexiconFormatting(item: LexiconItem): Promise<any> {
    const prompt = `You are improving the formatting of lexicon descriptions for F3 (fitness/workout community). Your task is to add strategic line breaks for better readability while preserving ALL original content exactly.

CRITICAL RULES:
- PRESERVE every single word, spelling, capitalization, and punctuation mark EXACTLY
- DO NOT change any text content whatsoever
- DO NOT fix grammar, spelling, or capitalization
- ONLY add strategic line breaks where they improve readability
- Keep sentences together when they flow naturally - DO NOT break sentences in the middle
- Only add line breaks between complete sentences or at major clause boundaries
- Add paragraph breaks (double line breaks) between distinct concepts/thoughts
- Preserve any existing abbreviations like "(abbr. XYZ)" exactly as written
- DO NOT add quotes around your response
- Return only the formatted text, nothing else

EXAMPLE 1 (short, keep as one line):
INPUT: "The practice of forming a Ball of Man at the beginning of a COT in order to engender feelings of comfort and acceptance between the Pax with the purpose of creating an environment of increased vulnerability and sharing."
OUTPUT: The practice of forming a Ball of Man at the beginning of a COT in order to engender feelings of comfort and acceptance between the Pax with the purpose of creating an environment of increased vulnerability and sharing.

EXAMPLE 2 (longer text with multiple concepts):
INPUT: "An injury sustained during a BeatDown, or less heroically (as those of us in the 3rd 500 of life know) because we slept on it wrong. Inspired by often injured NHL hockey player Dustin Penner who famously & laughingly threw his back out while eating pancakes at the breakfast table with his wife. Ironic Adjunct: he ended up being traded to another team for a 4th round pick… on National Pancake Day."
OUTPUT: An injury sustained during a BeatDown, or less heroically (as those of us in the 3rd 500 of life know) because we slept on it wrong.

Inspired by often injured NHL hockey player Dustin Penner who famously & laughingly threw his back out while eating pancakes at the breakfast table with his wife.

Ironic Adjunct: he ended up being traded to another team for a 4th round pick… on National Pancake Day.

Current text to format:
${item.description}

Return the text with improved formatting (no quotes, no explanations):`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1
      });

      const formattedText = response.choices[0].message.content?.trim();
      if (!formattedText) {
        throw new Error('Empty response from OpenAI');
      }

      // Remove any quotes that might have been added
      const cleanedFormattedText = formattedText.replace(/^["']|["']$/g, '');

      return { formattedText: cleanedFormattedText };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }
}