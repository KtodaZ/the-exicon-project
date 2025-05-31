import { LexiconCleanupEngine } from './lexicon-cleanup-engine.js';
import { CleanupConfig } from './types.js';
import { config } from './config.js';

async function main() {
  const engine = new LexiconCleanupEngine();
  
  try {
    await engine.initialize();
    
    // Enable auto-approval for bulk processing
    config.cleanup.autoApprove = true;
    config.cleanup.reviewRequired = false;
    
    console.log('🚀 BULK LEXICON AUTO-CLEANUP MODE');
    console.log('📊 Processing ALL lexicon items in batches of 20');
    console.log('⚠️  High-confidence proposals (>0.8) will be automatically applied!\n');
    
    const descriptionCleanup: CleanupConfig = {
      field: 'description',
      prompt: `Clean up the description field for this F3 lexicon term by ONLY removing HTML artifacts and formatting. 

CRITICAL REQUIREMENTS:
- Remove ONLY HTML tags, style attributes, and formatting elements
- Remove font family specifications (like "Calibri, Arial", "docs-Calibri", etc.)
- Remove color and style attributes (style="...", color="...", etc.)
- Fix HTML entity encoding (&nbsp; → space, &amp; → &, etc.)
- DO NOT change any original text, spelling, capitalization, or punctuation
- DO NOT add or remove commas, periods, or other punctuation
- DO NOT change word capitalization (keep "Team" as "Team", "Effective" as "Effective", etc.)
- DO NOT rephrase or reword anything
- DO NOT fix grammar or improve sentence structure
- PRESERVE the exact original text content character-for-character
- If the content has no HTML artifacts, return it completely unchanged

The goal is ONLY to strip away HTML formatting while preserving the original author's exact text, spelling, and capitalization.

Examples:
- "<span style='font-family: Calibri'>Short for King Of Birds.</span>" → "Short for King Of Birds."
- "<p style='margin-left: 0px'>Text here</p>" → "Text here"
- "Text with&nbsp;spaces" → "Text with spaces"`,
      model: 'gpt-4o-mini',
      maxTokens: 300,
      temperature: 0.1,
      batchSize: 20
    };

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let batchNumber = 1;
    
    console.log('Starting bulk lexicon cleanup...\n');
    
    while (true) {
      console.log(`\n🔄 Processing batch ${batchNumber}...`);
      
      const results = await engine.runCleanup(descriptionCleanup);
      
      if (results.length === 0) {
        console.log('✅ No more lexicon items to process!');
        break;
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      totalProcessed += results.length;
      totalSuccessful += successful;
      totalFailed += failed;
      
      console.log(`   Batch ${batchNumber} results: ${successful} successful, ${failed} failed/skipped`);
      
      // Add a delay between batches to be respectful
      if (results.length === descriptionCleanup.batchSize) {
        console.log('   Waiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      batchNumber++;
      
      // Safety check - stop after processing a reasonable number
      if (totalProcessed >= 1000) {
        console.log('⚠️  Reached processing limit (1000 items). Stopping for safety.');
        break;
      }
    }
    
    console.log('\n🎉 BULK LEXICON CLEANUP COMPLETE!');
    console.log(`📊 Total processed: ${totalProcessed}`);
    console.log(`✅ Successful: ${totalSuccessful}`);
    console.log(`❌ Failed/skipped: ${totalFailed}`);
    
    if (totalSuccessful > 0) {
      console.log(`\n💾 ${totalSuccessful} lexicon descriptions have been cleaned up and applied!`);
    }
    
  } catch (error) {
    console.error('Bulk lexicon cleanup failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

// Execute the main function if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default main; 