import { CleanupEngine } from './cleanup-engine.js';
import * as readline from 'readline';

async function main() {
  const engine = new CleanupEngine();
  
  try {
    await engine.initialize();
    
    const proposals = await engine.getPendingProposals();
    
    if (proposals.length === 0) {
      console.log('No pending proposals to review.');
      return;
    }
    
    console.log(`Found ${proposals.length} pending proposals to review.\n`);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      
      console.log(`\n--- Proposal ${i + 1}/${proposals.length} ---`);
      console.log(`Exercise: ${proposal.exerciseId}`);
      console.log(`Field: ${proposal.field}`);
      console.log(`Confidence: ${(proposal.confidence * 100).toFixed(1)}%`);
      console.log(`Reason: ${proposal.reason}`);
      console.log(`\nCURRENT VALUE:`);
      console.log(proposal.currentValue);
      console.log(`\nPROPOSED VALUE:`);
      console.log(proposal.proposedValue);
      
      const decision = await askQuestion(rl, '\nApprove this change? (y/n/s=skip): ');
      
      switch (decision.toLowerCase()) {
        case 'y':
        case 'yes':
          await engine.approveProposal(proposal._id!);
          console.log('✓ Approved');
          break;
        case 'n':
        case 'no':
          await engine.rejectProposal(proposal._id!);
          console.log('✗ Rejected');
          break;
        case 's':
        case 'skip':
          console.log('⏭ Skipped');
          break;
        default:
          console.log('⏭ Skipped (invalid input)');
          break;
      }
    }
    
    rl.close();
    
    console.log(`\nReview complete! Use 'npm run apply' to apply approved changes.`);
    
  } catch (error) {
    console.error('Review failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

if (require.main === module) {
  main();
}