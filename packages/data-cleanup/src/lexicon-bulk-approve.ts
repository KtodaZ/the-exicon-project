import { LexiconCleanupEngine } from './lexicon-cleanup-engine.js';

async function main() {
  const engine = new LexiconCleanupEngine();
  
  try {
    await engine.initialize();
    
    // Get all pending proposals
    const db = (engine as any).db; // Access the private db property
    const proposals = await db.getLexiconProposalsByType('description', 'pending', 100);
    
    if (proposals.length === 0) {
      console.log('No pending lexicon proposals found.');
      return;
    }
    
    console.log(`📋 Found ${proposals.length} pending lexicon proposals`);
    console.log('🚀 Approving all proposals...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      try {
        // Use the ObjectId as string
        const proposalId = proposal._id?.toString();
        if (!proposalId) {
          throw new Error('Proposal has no _id');
        }
        
        await db.approveLexiconProposal(proposalId);
        successCount++;
        console.log(`✅ ${i + 1}/${proposals.length}: Approved lexicon item ${proposal.lexiconId}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ ${i + 1}/${proposals.length}: Failed to approve lexicon item ${proposal.lexiconId}:`, error);
      }
    }
    
    console.log(`\n🎉 Bulk approval complete!`);
    console.log(`✅ Successfully approved: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Bulk approval failed:', error);
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