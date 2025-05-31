import { LexiconAIFormatter } from './lexicon-ai-formatter.js';

async function main() {
  const formatter = new LexiconAIFormatter();
  
  try {
    await formatter.initialize();
    
    console.log('🚀 Starting BULK AI-powered lexicon formatting...');
    console.log('This will process ALL lexicon items that could benefit from better formatting\n');
    
    let totalProcessed = 0;
    let totalProposals = 0;
    let batchNumber = 1;
    const batchSize = 20;
    
    while (true) {
      console.log(`\n📦 Processing batch ${batchNumber} (${batchSize} items)...`);
      
      // Run AI formatting on current batch
      const results = await formatter.formatItems(batchSize);
      
      if (results.length === 0) {
        console.log('✅ No more items to process - bulk AI formatting complete!');
        break;
      }
      
      // Count successful results with proposals
      const successfulWithProposals = results.filter(r => 
        r.success && r.proposal
      );
      
      totalProcessed += results.length;
      totalProposals += successfulWithProposals.length;
      batchNumber++;
      
      console.log(`   Batch ${batchNumber - 1} complete: ${results.length} processed, ${successfulWithProposals.length} formatting proposals created`);
      
      // Small delay between batches to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 BULK AI FORMATTING COMPLETE!');
    console.log(`📊 Final Results:`);
    console.log(`   • Total items processed: ${totalProcessed}`);
    console.log(`   • Formatting proposals created: ${totalProposals}`);
    console.log(`   • Batches completed: ${batchNumber - 1}`);
    
    if (totalProposals > 0) {
      console.log('\n📋 To review formatting proposals:');
      console.log('pnpm run lexicon:review');
      console.log('\n✅ To approve all formatting proposals:');
      console.log('pnpm run lexicon:bulk-approve');
    }
    
  } catch (error) {
    console.error('Bulk AI formatting failed:', error);
    process.exit(1);
  } finally {
    await formatter.cleanup();
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