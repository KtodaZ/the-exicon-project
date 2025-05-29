import OpenAI from 'openai';
import { config } from './config.js';
import { CleanupConfig, Exercise } from './types.js';

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
}