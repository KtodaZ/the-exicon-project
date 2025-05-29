import { CleanupEngine } from './cleanup-engine.js';
import { CleanupConfig } from './types.js';
import { config } from './config.js';

async function main() {
  const engine = new CleanupEngine();
  
  try {
    await engine.initialize();
    
    // Enable auto-approval for bulk processing
    config.cleanup.autoApprove = true;
    config.cleanup.reviewRequired = false;
    
    console.log('🚀 BULK AUTO-CLEANUP MODE');
    console.log('📊 Processing ALL exercises in batches of 30');
    console.log('⚠️  All proposals will be automatically applied!\n');
    
    const descriptionCleanup: CleanupConfig = {
      field: 'description',
      prompt: `Generate a concise description field from the provided text content. This will be used as a quick summary for the exercise.

Requirements:
- If the source text is already short and clear (2 sentences or less), copy it exactly as-is
- Otherwise, create 1-2 VERY SHORT sentences maximum
- Length MUST be under 110 characters
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

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let batchNumber = 1;
    
    console.log('Starting bulk cleanup...\n');
    
    while (true) {
      console.log(`\n--- BATCH ${batchNumber} ---`);
      
      const results = await engine.runCleanup(descriptionCleanup);
      
      if (results.length === 0) {
        console.log('🎉 All exercises processed!');
        break;
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      totalProcessed += results.length;
      totalSuccessful += successful;
      totalFailed += failed;
      
      console.log(`Batch ${batchNumber}: ✅ ${successful} successful, ❌ ${failed} failed`);
      console.log(`Running total: ${totalProcessed} processed, ${totalSuccessful} successful`);
      
      batchNumber++;
      
      // Small delay between batches to be respectful to APIs
      if (results.length > 0) {
        console.log('Waiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`\n🎯 BULK CLEANUP COMPLETE!`);
    console.log(`📈 Total processed: ${totalProcessed}`);
    console.log(`✅ Total successful: ${totalSuccessful}`);
    console.log(`❌ Total failed: ${totalFailed}`);
    console.log(`💾 All changes applied to MongoDB`);
    
  } catch (error) {
    console.error('Bulk cleanup failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

if (require.main === module) {
  main();
}