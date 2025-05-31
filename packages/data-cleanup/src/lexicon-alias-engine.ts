import { DatabaseManager } from './database.js';
import { OpenAIClient } from './openai-client.js';
import { config } from './config.js';
import { LexiconItem, LexiconCleanupProposal, LexiconCleanupResult, LexiconAlias } from './types.js';

export class LexiconAliasEngine {
  private db: DatabaseManager;
  private openai: OpenAIClient;
  private processedIds: Set<string> = new Set();

  constructor() {
    this.db = new DatabaseManager();
    this.openai = new OpenAIClient();
  }

  async initialize(): Promise<void> {
    await this.db.connect();
    console.log('Lexicon alias engine initialized');
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }

  async runAliasDetection(batchSize: number = 20): Promise<LexiconCleanupResult[]> {
    console.log('🔍 Starting lexicon alias detection...');
    console.log('This will analyze descriptions and add aliases for alternative names\n');
    
    // Get lexicon items that need alias analysis (those without aliases or with empty aliases)
    const lexiconItems = await this.getLexiconItemsForAliases(batchSize);
    
    console.log(`Found ${lexiconItems.length} lexicon items to analyze for aliases`);
    
    if (lexiconItems.length === 0) {
      console.log('No new lexicon items to process for aliases!');
      return [];
    }
    
    const results: LexiconCleanupResult[] = [];
    
    for (const item of lexiconItems) {
      try {
        console.log(`Processing: ${item.title}`);
        const result = await this.processLexiconItemForAliases(item);
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
    
    console.log('\n🎉 Lexicon alias detection complete!');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`- Successful proposals: ${successful}`);
    console.log(`- Failed/skipped: ${failed}`);
    
    if (successful > 0) {
      console.log('\nTo review pending proposals:');
      console.log('cd packages/data-cleanup && pnpm run lexicon:review');
    }
    
    return results;
  }

  private async getLexiconItemsForAliases(limit: number): Promise<LexiconItem[]> {
    const collection = this.db.getLexiconCollection();
    
    // Get items that don't have aliases or have empty aliases array
    // Simplified query to avoid TypeScript issues
    const items = await collection
      .find({
        description: { $exists: true, $ne: '' }
      })
      .limit(limit * 3) // Get more items to filter from
      .toArray();

    // Filter in memory to avoid complex MongoDB typing issues
    const filteredItems = items.filter(item => {
      // Skip if already processed
      if (this.processedIds.has(item._id)) return false;
      
      // Skip if already has aliases
      if (item.aliases && Array.isArray(item.aliases) && item.aliases.length > 0) return false;
      
      return true;
    });

    return filteredItems.slice(0, limit);
  }

  private async processLexiconItemForAliases(item: LexiconItem): Promise<LexiconCleanupResult> {
    try {
      // Use AI to detect aliases in the description
      const result = await this.openai.generateLexiconAliases(item);
      const detectedAliases: LexiconAlias[] = result.aliases;

      if (detectedAliases.length === 0) {
        console.log(`  ⏭️  ${item.title}: No aliases detected`);
        return { success: true };
      }

      // Calculate confidence based on number and quality of aliases found
      let confidence = 0.8; // Base confidence for alias detection
      if (detectedAliases.length > 1) confidence += 0.1;
      confidence = Math.min(confidence, 1.0);

      const proposal: LexiconCleanupProposal = {
        lexiconId: item._id,
        field: 'aliases',
        currentValue: item.aliases || [],
        proposedValue: detectedAliases,
        reason: `Detected ${detectedAliases.length} aliases: ${detectedAliases.map(a => a.name).join(', ')}`,
        confidence,
        timestamp: new Date(),
        status: 'pending'
      };

      // Auto-approve high confidence changes
      if (confidence >= config.cleanup.autoApproveMinConfidence) {
        await this.applyAliasProposal(proposal);
        console.log(`  ✅ ${item.title}: Auto-applied ${detectedAliases.length} aliases (confidence: ${(confidence * 100).toFixed(1)}%)`);
        return { success: true, proposal };
      } else {
        await this.db.saveLexiconProposal(proposal);
        console.log(`  📋 ${item.title}: Proposal saved for review - ${detectedAliases.length} aliases (confidence: ${(confidence * 100).toFixed(1)}%)`);
        return { success: true, proposal };
      }

    } catch (error) {
      console.error(`  ❌ ${item.title}: Error processing:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async applyAliasProposal(proposal: LexiconCleanupProposal): Promise<void> {
    // Apply the aliases directly to the lexicon item
    const lexiconCollection = this.db.getLexiconCollection();
    await lexiconCollection.updateOne(
      { _id: proposal.lexiconId },
      {
        $set: {
          aliases: proposal.proposedValue,
          updatedAt: new Date()
        }
      }
    );

    // Save the proposal as applied
    proposal.status = 'applied';
    proposal.appliedAt = new Date();
    await this.db.saveLexiconProposal(proposal);
  }

  async reviewAliasProposals(): Promise<void> {
    const proposals = await this.db.getLexiconProposalsByType('aliases');
    
    if (proposals.length === 0) {
      console.log('No pending alias proposals found');
      return;
    }

    console.log(`\n📋 Found ${proposals.length} pending alias proposals:\n`);
    
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      console.log(`${i + 1}. ${proposal.lexiconId}`);
      console.log(`   Current aliases: ${JSON.stringify(proposal.currentValue)}`);
      console.log(`   Proposed aliases: ${JSON.stringify(proposal.proposedValue)}`);
      console.log(`   Reason: ${proposal.reason}`);
      console.log(`   Confidence: ${proposal.confidence}`);
      console.log(`   Timestamp: ${proposal.timestamp.toISOString()}`);
      console.log('');
    }
  }

  async approveProposal(proposalId: string): Promise<void> {
    await this.db.approveLexiconProposal(proposalId);
    console.log(`✅ Approved and applied alias proposal ${proposalId}`);
  }

  async rejectProposal(proposalId: string): Promise<void> {
    await this.db.rejectLexiconProposal(proposalId);
    console.log(`❌ Rejected alias proposal ${proposalId}`);
  }
} 