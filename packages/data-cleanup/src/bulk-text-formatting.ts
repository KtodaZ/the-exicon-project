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
    
    console.log('📝 BULK TEXT FORMATTING MODE');
    console.log('📊 Processing ALL exercises to improve text formatting in batches of 30');
    console.log('⚠️  All formatting improvements will be automatically applied!\n');
    
    const textFormatting: CleanupConfig = {
      field: 'text',
      prompt: `Improve the formatting and readability of this exercise text while preserving ALL original content and meaning.

FORMATTING GUIDELINES:
- Use proper paragraph breaks (\\n\\n) to separate distinct concepts or sections
- Use single line breaks (\\n) within related content for better readability
- Preserve all original text content - DO NOT remove, change, or paraphrase anything
- Keep F3 terminology and culture intact
- Improve structure by organizing information logically
- Add spacing around key concepts or instructions
- Keep sentences and phrases exactly as written - only improve formatting/spacing

EXAMPLE INPUT:
"This is a classic exercise that can be worked into any THANG you might have in mind (or even a warmup or MARY). The Navy Seal burpee (or Seal Burpee) is a standard burpee but on the down you are executing a sequence of three merkins where on the first two, execute a knee-tuck on the up."

EXAMPLE OUTPUT:
"This is a classic exercise that can be worked into any THANG you might have in mind (or even a warmup or MARY).

The Navy Seal burpee (or Seal Burpee) is a standard burpee but on the down you are executing a sequence of three merkins where on the first two, execute a knee-tuck on the up."

RULES:
1. Preserve every word and phrase exactly as written
2. Only improve spacing, line breaks, and paragraph structure  
3. Do not change terminology, grammar, or phrasing
4. Focus on making the text more scannable and readable
5. Use \\n for line breaks and \\n\\n for paragraph breaks

Return JSON format: {"value": "formatted text here", "reason": "brief explanation of formatting improvements", "confidence": 0.9}`,
      model: 'gpt-4o-mini',
      maxTokens: 500,
      temperature: 0.2, // Lower temperature for more consistent formatting
      batchSize: 30
    };

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let batchNumber = 1;
    
    console.log('Starting bulk text formatting...\n');
    
    while (true) {
      console.log(`\n--- BATCH ${batchNumber} ---`);
      
      const results = await engine.runCleanup(textFormatting);
      
      if (results.length === 0) {
        console.log('🎉 All exercises text formatting complete!');
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
    
    console.log(`\n🎯 BULK TEXT FORMATTING COMPLETE!`);
    console.log(`📈 Total processed: ${totalProcessed}`);
    console.log(`✅ Total successful: ${totalSuccessful}`);
    console.log(`❌ Total failed: ${totalFailed}`);
    console.log(`📝 All text formatting changes applied to MongoDB`);
    
  } catch (error) {
    console.error('Bulk text formatting failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

if (require.main === module) {
  main();
}