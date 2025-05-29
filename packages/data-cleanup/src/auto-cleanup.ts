import { CleanupEngine } from './cleanup-engine.js';
import { CleanupConfig } from './types.js';
import { config } from './config.js';

async function main() {
  const engine = new CleanupEngine();
  
  try {
    await engine.initialize();
    
    // Enable auto-approval for this run
    const originalAutoApprove = config.cleanup.autoApprove;
    const originalReviewRequired = config.cleanup.reviewRequired;
    
    // Temporarily enable auto-approval
    config.cleanup.autoApprove = true;
    config.cleanup.reviewRequired = false; // Skip all reviews
    
    console.log('🚀 AUTO-APPROVAL MODE ENABLED');
    console.log('⚠️  All proposals will be automatically applied to the database!');
    console.log(`📊 Minimum confidence threshold: ${config.cleanup.autoApproveMinConfidence * 100}%\n`);
    
    // Description cleanup configuration
    const descriptionCleanup: CleanupConfig = {
      field: 'description',
      prompt: `Generate a concise description field from the provided text content. This will be used as a quick summary for the exercise.

Requirements:
- If the source text is already short and clear (2 sentences or less), copy it exactly as-is
- Otherwise, create 1-2 SHORT sentences maximum
- Preserve F3-specific terminology, humor, and personality from the original
- Focus on WHAT the exercise is and HOW to do it in basic terms
- Keep the authentic voice of the original author
- Make it suitable for quick scanning

Example good description: "In plank position, raise one side and bring the high side knee up, just like Captain Morgan striking a pose."

The goal is to create helpful quick-glance summaries while honoring the original author's contribution.`,
      model: 'gpt-4o-mini',
      maxTokens: 300,
      temperature: 0.3,
      batchSize: 30
    };

    console.log('Starting auto-cleanup...');
    const results = await engine.runCleanup(descriptionCleanup);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n✅ Auto-cleanup complete!`);
    console.log(`📈 Successful: ${successful}`);
    console.log(`❌ Failed/skipped: ${failed}`);
    
    // Restore original settings
    config.cleanup.autoApprove = originalAutoApprove;
    config.cleanup.reviewRequired = originalReviewRequired;
    
  } catch (error) {
    console.error('Auto-cleanup failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

if (require.main === module) {
  main();
}