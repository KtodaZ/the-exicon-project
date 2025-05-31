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
}