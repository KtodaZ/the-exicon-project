import { CleanupEngine } from './cleanup-engine.js';
import { CleanupConfig } from './types.js';

async function main() {
  const engine = new CleanupEngine();
  
  try {
    await engine.initialize();
    
    // Description generation configuration
    const descriptionCleanup: CleanupConfig = {
      field: 'description',
      prompt: `Generate a concise description field from the provided text content. This will be used as a quick summary for the exercise.

Requirements:
- If the source text is already short and clear (2 sentences or less), copy it exactly as-is
- Otherwise, create 1-2 VERY SHORT sentences maximum. 
- Length MUST be under 110 characters.
- Preserve F3-specific terminology, humor, and personality from the original
- Focus on WHAT the exercise is and HOW to do it in basic terms
- Keep the authentic voice of the original author
- Make it suitable for quick scanning


Example good description: "In plank position, raise one side and bring the high side knee up, just like Captain Morgan striking a pose."

The goal is to create helpful quick-glance summaries while honoring the original author's contribution.`,
      model: 'gpt-4o-mini',
      maxTokens: 300,
      temperature: 0.3,
      batchSize: 30 // Process 30 at a time
    };

    console.log('Starting description cleanup...');
    const results = await engine.runCleanup(descriptionCleanup);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\nCleanup complete!`);
    console.log(`- Successful proposals: ${successful}`);
    console.log(`- Failed/skipped: ${failed}`);
    console.log(`\nUse 'npm run review' to review pending proposals.`);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

if (require.main === module) {
  main();
}