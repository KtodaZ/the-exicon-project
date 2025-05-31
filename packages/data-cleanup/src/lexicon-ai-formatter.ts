import { DatabaseManager } from './database.js';
import { OpenAIClient } from './openai-client.js';
import { LexiconItem, LexiconCleanupProposal } from './types.js';

export class LexiconAIFormatter {
  private db: DatabaseManager;
  private openai: OpenAIClient;
  private processedIds: Set<string> = new Set();

  constructor() {
    this.db = new DatabaseManager();
    this.openai = new OpenAIClient();
  }

  async initialize(): Promise<void> {
    await this.db.connect();
    console.log('AI-powered lexicon formatter initialized');
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }

  async formatItems(batchSize: number = 20): Promise<any[]> {
    // Get lexicon items that might need formatting (long single lines or very short descriptions)
    const lexiconItems = await this.db.getLexiconItemsForCleanup(
      'description', 
      batchSize, 
      Array.from(this.processedIds)
    );
    
    console.log(`Found ${lexiconItems.length} lexicon items to process for formatting`);
    
    if (lexiconItems.length === 0) {
      console.log('No new lexicon items to process!');
      return [];
    }
    
    const results: any[] = [];
    
    for (const item of lexiconItems) {
      try {
        console.log(`Processing: ${item.title}`);
        const result = await this.processLexiconItem(item);
        results.push(result);
        
        // Track processed IDs
        this.processedIds.add(item._id);
        
        // Add a small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${item.title}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  private async processLexiconItem(item: LexiconItem): Promise<any> {
    try {
      const currentValue = item.description;
      if (!currentValue || typeof currentValue !== 'string') {
        return { success: false, error: 'Description is empty or not a string' };
      }

      // Skip if it's very short or already well-formatted
      if (currentValue.length < 100 || (currentValue.includes('\n') && currentValue.length < 200)) {
        console.log(`  ⏭️  ${item.title}: Already well-formatted (${currentValue.length} chars)`);
        return { success: true };
      }

      // Generate improved formatting
      const result = await this.openai.generateLexiconFormatting(item);
      const proposedValue = result.formattedText;

      // Check if there are meaningful formatting changes
      const cleanForComparison = (text: string) => text
        .replace(/\s+/g, ' ')
        .trim();
      
      const cleanedCurrent = cleanForComparison(currentValue);
      const cleanedProposed = cleanForComparison(proposedValue);
      
      // If content is the same (good!), check if formatting actually changed
      if (cleanedCurrent === cleanedProposed) {
        // Content is preserved, but did formatting actually change?
        if (currentValue === proposedValue) {
          console.log(`  ⏭️  ${item.title}: No meaningful formatting changes needed`);
          return { success: true };
        }
        // Content same but formatting different - this is what we want!
      } else {
        // Content changed - reject for safety
        console.log(`  ⚠️  ${item.title}: Content changes detected - skipping for safety`);
        return { success: false, error: 'Content changes detected' };
      }

      const proposal: LexiconCleanupProposal = {
        lexiconId: item._id,
        field: 'description',
        currentValue,
        proposedValue,
        reason: 'Improved formatting with strategic line breaks for better readability',
        confidence: 0.9, // High confidence for formatting-only changes
        timestamp: new Date(),
        status: 'pending'
      };

      // Save proposal for review
      await this.db.saveLexiconProposal(proposal);
      console.log(`  📋 ${item.title}: Formatting proposal saved for review`);
      return { success: true, proposal };

    } catch (error) {
      console.error(`  ❌ ${item.title}: Error processing:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async reviewFormatting(): Promise<void> {
    const proposals = await this.db.getLexiconProposalsByType('description');
    
    if (proposals.length === 0) {
      console.log('No pending lexicon formatting proposals found');
      return;
    }

    console.log(`\n📋 Found ${proposals.length} pending lexicon formatting proposals:\n`);
    
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      console.log(`${i + 1}. ${proposal.lexiconId}`);
      console.log(`   Current:`);
      console.log(`   "${proposal.currentValue}"`);
      console.log(`   Proposed formatting:`);
      console.log(`   "${proposal.proposedValue}"`);
      console.log(`   Reason: ${proposal.reason}`);
      console.log(`   Confidence: ${(proposal.confidence * 100).toFixed(1)}%`);
      console.log('');
    }
  }
}

async function main() {
  const formatter = new LexiconAIFormatter();
  
  try {
    await formatter.initialize();
    
    console.log('🔍 Processing lexicon items for AI-powered formatting...');
    const results = await formatter.formatItems(10); // Start with a smaller batch
    
    const successfulResults = results.filter(r => r.success && r.proposal);
    console.log(`\n✅ Generated ${successfulResults.length} formatting proposals`);
    
    if (successfulResults.length > 0) {
      console.log('\n📋 To review proposals: pnpm run lexicon:review');
      console.log('✅ To approve all: pnpm run lexicon:bulk-approve');
    }
    
  } catch (error) {
    console.error('Formatting failed:', error);
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