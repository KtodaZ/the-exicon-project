import { DatabaseManager } from './database.js';

async function main() {
    const confirmFlag = process.argv[2];

    if (confirmFlag !== '--confirm') {
        console.log('🚨 This will delete ALL exercise reference proposals!');
        console.log('⚠️  Use: pnpm clear-proposals --confirm');
        console.log('💡 This is useful if you want to completely redo the bulk processing.');
        process.exit(1);
    }

    const db = new DatabaseManager();

    try {
        await db.connect();

        console.log('🔍 Clearing all exercise reference proposals...');

        const collection = db.getProposalsCollection();

        // Delete proposals for reference-related fields
        const result = await collection.deleteMany({
            field: { $in: ['referencedExercises', 'description'] }
        });

        console.log(`✅ Cleared ${result.deletedCount} exercise reference proposals!`);
        console.log('💡 You can now run bulk-hybrid-references again.');

    } catch (error) {
        console.error('❌ Failed to clear proposals:', error);
        process.exit(1);
    } finally {
        await db.disconnect();
    }
}

if (require.main === module) {
    main();
} 