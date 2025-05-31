import { LexiconAliasEngine } from './lexicon-alias-engine.js';

async function main() {
  const engine = new LexiconAliasEngine();
  
  try {
    await engine.initialize();
    
    console.log('🚀 Starting BULK lexicon alias detection...');
    console.log('This will process ALL lexicon items in batches until complete\n');
    
    let totalProcessed = 0;
    let totalAliasesFound = 0;
    let batchNumber = 1;
    const batchSize = 20;
    
    while (true) {
      console.log(`\n📦 Processing batch ${batchNumber} (${batchSize} items)...`);
      
      // Run alias detection on current batch
      const results = await engine.runAliasDetection(batchSize);
      
      if (results.length === 0) {
        console.log('✅ No more items to process - bulk alias detection complete!');
        break;
      }
      
      // Count successful results with aliases
      const successfulWithAliases = results.filter(r => 
        r.success && r.proposal && Array.isArray(r.proposal.proposedValue) && r.proposal.proposedValue.length > 0
      );
      
      totalProcessed += results.length;
      totalAliasesFound += successfulWithAliases.length;
      batchNumber++;
      
      console.log(`   Batch ${batchNumber - 1} complete: ${results.length} processed, ${successfulWithAliases.length} with aliases found`);
      
      // Small delay between batches to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 BULK ALIAS DETECTION COMPLETE!');
    console.log(`📊 Final Results:`);
    console.log(`   • Total items processed: ${totalProcessed}`);
    console.log(`   • Items with aliases found: ${totalAliasesFound}`);
    console.log(`   • Batches completed: ${batchNumber - 1}`);
    
    if (totalAliasesFound > 0) {
      console.log('\n📋 To review any pending proposals:');
      console.log('pnpm run lexicon:aliases-review');
      console.log('\n✅ To approve all pending alias proposals:');
      console.log('pnpm run lexicon:bulk-approve');
    }
    
  } catch (error) {
    console.error('Bulk alias detection failed:', error);
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