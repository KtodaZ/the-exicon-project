import { DatabaseManager } from './database.js';

async function main() {
    const proposalId = process.argv[2];

    if (!proposalId) {
        console.error('❌ Usage: pnpm approve-proposal <proposal-id>');
        process.exit(1);
    }

    const db = new DatabaseManager();

    try {
        await db.connect();

        console.log(`🔍 Approving proposal: ${proposalId}`);

        await db.approveProposal(proposalId);

        console.log('✅ Proposal approved and applied to exercise!');

    } catch (error) {
        console.error('❌ Failed to approve proposal:', error);
        process.exit(1);
    } finally {
        await db.disconnect();
    }
}

if (require.main === module) {
    main();
} 