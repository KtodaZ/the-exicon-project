import { DatabaseManager } from './database.js';
import * as readline from 'readline';

// Create readline interface for interactive prompts
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim().toLowerCase());
        });
    });
}

async function interactiveReview(db: DatabaseManager, proposals: any[]) {
    console.log('\n🔄 INTERACTIVE REVIEW MODE');
    console.log('Options for each proposal:');
    console.log('  y/yes     - Approve this proposal');
    console.log('  n/no      - Reject this proposal');
    console.log('  a/all     - Approve this and ALL remaining proposals');
    console.log('  q/quit    - Quit without processing remaining proposals');
    console.log('');

    let approveAll = false;
    let totalApproved = 0;
    let totalRejected = 0;

    for (let i = 0; i < proposals.length; i++) {
        const proposal = proposals[i];

        console.log(`\n📋 PROPOSAL ${i + 1} of ${proposals.length}`);
        console.log(`Exercise ID: ${proposal.exerciseId}`);
        console.log(`Field: ${proposal.field}`);
        console.log(`Confidence: ${(proposal.confidence * 100).toFixed(1)}%`);

        if (proposal.field === 'referencedExercises') {
            const current = Array.isArray(proposal.currentValue) ? proposal.currentValue : [];
            const proposed = Array.isArray(proposal.proposedValue) ? proposal.proposedValue : [];

            console.log(`Current references: [${current.join(', ')}]`);
            console.log(`Proposed references: [${proposed.join(', ')}]`);
        } else if (proposal.field === 'description') {
            console.log(`Current: "${String(proposal.currentValue).substring(0, 150)}..."`);
            console.log(`Proposed: "${String(proposal.proposedValue).substring(0, 150)}..."`);
        }

        let action = '';

        if (approveAll) {
            action = 'y';
            console.log('Auto-approving (approve all mode)...');
        } else {
            action = await askQuestion('\nApprove this proposal? (y/n/a/q): ');
        }

        if (action === 'q' || action === 'quit') {
            console.log('👋 Exiting review...');
            break;
        } else if (action === 'a' || action === 'all') {
            approveAll = true;
            action = 'y';
            console.log('✨ Enabling "approve all" mode for remaining proposals...');
        }

        try {
            if (action === 'y' || action === 'yes') {
                await db.approveProposal(proposal._id);
                console.log('✅ Approved and applied to exercises collection!');
                totalApproved++;
            } else if (action === 'n' || action === 'no') {
                await db.rejectProposal(proposal._id);
                console.log('❌ Rejected!');
                totalRejected++;
            } else {
                console.log('❓ Invalid option, skipping...');
                continue;
            }
        } catch (error) {
            console.error(`❌ Error processing proposal: ${error}`);
        }
    }

    console.log(`\n📊 REVIEW COMPLETE!`);
    console.log(`✅ Approved: ${totalApproved}`);
    console.log(`❌ Rejected: ${totalRejected}`);
    console.log(`⏭️  Remaining: ${proposals.length - totalApproved - totalRejected}`);
}

async function main() {
    const db = new DatabaseManager();

    // Check if user wants to approve or reject a specific proposal
    const action = process.argv[2];
    const proposalId = process.argv[3];

    if ((action === 'approve' || action === 'reject') && proposalId) {
        try {
            await db.connect();

            if (action === 'approve') {
                console.log(`🔍 Approving proposal: ${proposalId}`);
                await db.approveProposal(proposalId);
                console.log('✅ Proposal approved and applied to exercises collection!');
            } else if (action === 'reject') {
                console.log(`🔍 Rejecting proposal: ${proposalId}`);
                await db.rejectProposal(proposalId);
                console.log('✅ Proposal rejected!');
            }
            return;
        } catch (error) {
            console.error(`❌ Failed to ${action} proposal:`, error);
            process.exit(1);
        } finally {
            await db.disconnect();
        }
    }

    try {
        await db.connect();

        console.log('🔍 EXERCISE REFERENCE PROPOSALS REVIEW\n');

        // Get pending exercise reference proposals with pagination
        let allProposals: any[] = [];
        let proposals: any[] = [];
        let skip = 0;
        const batchSize = 200;
        const maxToCheck = 10000; // Increased maximum total proposals to check
        
        console.log('🔍 Searching for proposals with actual changes...');
        
        // Continue searching until we've checked all proposals or hit the limit
        while (allProposals.length < maxToCheck) {
            const batch = await db.getExerciseReferenceProposals('pending', batchSize, skip);
            
            if (batch.length === 0) {
                console.log('📄 Reached end of proposals');
                break;
            }
            
            allProposals.push(...batch);
            
            // Filter out proposals that don't have actual proposed changes
            const filteredBatch = batch.filter(proposal => {
                if (proposal.field === 'referencedExercises') {
                    const proposed = Array.isArray(proposal.proposedValue) ? proposal.proposedValue : [];
                    return proposed.length > 0; // Only show if there are actual proposed references
                } else if (proposal.field === 'description') {
                    return proposal.proposedValue && proposal.proposedValue !== proposal.currentValue;
                }
                return true; // Keep other types of proposals
            });
            
            proposals.push(...filteredBatch);
            
            // Show progress every batch
            if (batch.length > 0) {
                console.log(`⏭️  Checked ${allProposals.length} proposals so far, found ${proposals.length} with changes...`);
            }
            
            skip += batchSize;
        }

        if (proposals.length === 0) {
            console.log('✅ No pending exercise reference proposals with actual changes found!');
            if (allProposals.length > 0) {
                console.log(`ℹ️  Searched through ${allProposals.length} total proposals, but none had actual proposed changes.`);
            }
            return;
        }

        console.log(`📋 Found ${proposals.length} pending proposals with actual changes (searched through ${allProposals.length} total proposals):\n`);

        // Check if user wants interactive mode
        if (action === 'interactive' || action === 'i') {
            await interactiveReview(db, proposals);
            return;
        }

        // Default: just show the proposals
        for (let i = 0; i < proposals.length; i++) {
            const proposal = proposals[i];

            console.log(`${i + 1}. Exercise ID: ${proposal.exerciseId}`);
            console.log(`   Field: ${proposal.field}`);
            console.log(`   Confidence: ${(proposal.confidence * 100).toFixed(1)}%`);
            console.log(`   Reason: ${proposal.reason}`);
            console.log(`   Created: ${proposal.timestamp.toLocaleString()}`);

            if (proposal.field === 'referencedExercises') {
                const current = Array.isArray(proposal.currentValue) ? proposal.currentValue : [];
                const proposed = Array.isArray(proposal.proposedValue) ? proposal.proposedValue : [];

                console.log(`   Current references: [${current.join(', ')}]`);
                console.log(`   Proposed references: [${proposed.join(', ')}]`);
            } else if (proposal.field === 'description') {
                console.log(`   Current: "${String(proposal.currentValue).substring(0, 100)}..."`);
                console.log(`   Proposed: "${String(proposal.proposedValue).substring(0, 100)}..."`);
            }

            console.log(`   Proposal ID: ${proposal._id}`);
            console.log('   ' + '-'.repeat(60));
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`Total pending proposals with changes: ${proposals.length}`);
        if (allProposals.length > proposals.length) {
            console.log(`Total pending proposals (including empty): ${allProposals.length}`);
            console.log(`Filtered out empty proposals: ${allProposals.length - proposals.length}`);
        }

        const referenceProposals = proposals.filter(p => p.field === 'referencedExercises');
        const descriptionProposals = proposals.filter(p => p.field === 'description');

        console.log(`Reference proposals: ${referenceProposals.length}`);
        console.log(`Description proposals: ${descriptionProposals.length}`);

        const avgConfidence = proposals.reduce((sum, p) => sum + p.confidence, 0) / proposals.length;
        console.log(`Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);

        console.log(`\n💡 REVIEW OPTIONS:`);
        console.log(`   pnpm review-proposals interactive  - Interactive approval mode`);
        console.log(`   pnpm review-proposals approve <id> - Approve specific proposal`);
        console.log(`   pnpm review-proposals reject <id>  - Reject specific proposal`);

    } catch (error) {
        console.error('Failed to review proposals:', error);
        process.exit(1);
    } finally {
        rl.close();
        await db.disconnect();
    }
}

if (require.main === module) {
    main();
} 