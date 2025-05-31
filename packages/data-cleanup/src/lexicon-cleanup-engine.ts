import { DatabaseManager } from './database.js';
import { OpenAIClient } from './openai-client.js';
import { config } from './config.js';
import { CleanupConfig, LexiconItem, LexiconCleanupProposal, LexiconCleanupResult } from './types.js';

export class LexiconCleanupEngine {
  private db: DatabaseManager;
  private openai: OpenAIClient;
  private processedIds: Set<string> = new Set();

  constructor() {
    this.db = new DatabaseManager();
    this.openai = new OpenAIClient();
  }

  async initialize(): Promise<void> {
    await this.db.connect();
    console.log('Lexicon cleanup engine initialized');
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }

  async runCleanup(cleanupConfig: CleanupConfig): Promise<LexiconCleanupResult[]> {
    const batchSize = cleanupConfig.batchSize || config.cleanup.defaultBatchSize;
    
    console.log(`Processing lexicon items for field: ${cleanupConfig.field}`);
    
    // Get lexicon items that need cleanup
    const lexiconItems = await this.db.getLexiconItemsForCleanup(
      cleanupConfig.field, 
      batchSize, 
      Array.from(this.processedIds)
    );
    
    console.log(`Found ${lexiconItems.length} lexicon items to process`);
    
    if (lexiconItems.length === 0) {
      console.log('No new lexicon items to process!');
      return [];
    }
    
    const results: LexiconCleanupResult[] = [];
    
    for (const item of lexiconItems) {
      try {
        console.log(`Processing: ${item.title}`);
        const result = await this.processLexiconItem(item, cleanupConfig.field);
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

  private async processLexiconItem(item: LexiconItem, field: string): Promise<LexiconCleanupResult> {
    try {
      const currentValue = (item as any)[field];
      if (!currentValue || typeof currentValue !== 'string') {
        return { success: false, error: `Field ${field} is empty or not a string` };
      }

      // Generate the cleaned content with improved formatting
      const result = await this.openai.generateLexiconCleanup(item, field);
      const proposedValue = result.cleanedText;

      // Check if there are meaningful changes
      // Remove only excessive whitespace for comparison, but preserve intentional formatting differences
      const cleanForComparison = (text: string) => text
        .replace(/[ \t]+/g, ' ')  // Multiple spaces/tabs -> single space
        .replace(/\n\s*\n\s*\n+/g, '\n\n')  // Multiple blank lines -> double newline
        .trim();
      
      const cleanedCurrent = cleanForComparison(currentValue);
      const cleanedProposed = cleanForComparison(proposedValue);
      
      if (cleanedCurrent === cleanedProposed) {
        console.log(`  ⏭️  ${item.title}: No meaningful changes needed`);
        return { success: true };
      }

      // Calculate confidence based on how much HTML-like content was removed
      const htmlTagCount = (currentValue.match(/<[^>]+>/g) || []).length;
      const styleAttrCount = (currentValue.match(/style\s*=/gi) || []).length;
      const entityCount = (currentValue.match(/&\w+;/g) || []).length;
      
      // Higher confidence for more obvious HTML artifacts
      let confidence = 0.7; // Base confidence for formatting improvements
      if (htmlTagCount > 0) confidence += 0.1;
      if (styleAttrCount > 0) confidence += 0.1;
      if (entityCount > 0) confidence += 0.1;
      confidence = Math.min(confidence, 1.0);

      const proposal: LexiconCleanupProposal = {
        lexiconId: item._id,
        field,
        currentValue,
        proposedValue,
        reason: `Removed HTML artifacts and improved text formatting with ${htmlTagCount} HTML tags, ${styleAttrCount} style attributes, and ${entityCount} HTML entities`,
        confidence,
        timestamp: new Date(),
        status: 'pending'
      };

      // Auto-approve high confidence changes
      if (confidence >= config.cleanup.autoApproveMinConfidence) {
        await this.applyLexiconProposal(proposal);
        console.log(`  ✅ ${item.title}: Auto-applied (confidence: ${(confidence * 100).toFixed(1)}%)`);
        return { success: true, proposal };
      } else {
        await this.db.saveLexiconProposal(proposal);
        console.log(`  📋 ${item.title}: Proposal saved for review (confidence: ${(confidence * 100).toFixed(1)}%)`);
        return { success: true, proposal };
      }

    } catch (error) {
      console.error(`  ❌ ${item.title}: Error processing:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async applyLexiconProposal(proposal: LexiconCleanupProposal): Promise<void> {
    // Apply the change directly to the lexicon item
    const lexiconCollection = this.db.getLexiconCollection();
    await lexiconCollection.updateOne(
      { _id: proposal.lexiconId },
      {
        $set: {
          [proposal.field]: proposal.proposedValue,
          updatedAt: new Date()
        }
      }
    );

    // Save the proposal as applied
    proposal.status = 'applied';
    proposal.appliedAt = new Date();
    await this.db.saveLexiconProposal(proposal);
  }

  async reviewProposals(field?: string): Promise<void> {
    const proposals = await this.db.getLexiconProposalsByType(field || 'description');
    
    if (proposals.length === 0) {
      console.log('No pending lexicon proposals found');
      return;
    }

    console.log(`\n📋 Found ${proposals.length} pending lexicon proposals:\n`);
    
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      console.log(`${i + 1}. ${proposal.lexiconId}`);
      console.log(`   Field: ${proposal.field}`);
      console.log(`   Current: "${proposal.currentValue}"`);
      console.log(`   Proposed: "${proposal.proposedValue}"`);
      console.log(`   Reason: ${proposal.reason}`);
      console.log(`   Confidence: ${proposal.confidence}`);
      console.log(`   Timestamp: ${proposal.timestamp.toISOString()}`);
      console.log('');
    }
  }

  async approveProposal(proposalId: string): Promise<void> {
    await this.db.approveLexiconProposal(proposalId);
    console.log(`✅ Approved and applied proposal ${proposalId}`);
  }

  async rejectProposal(proposalId: string): Promise<void> {
    await this.db.rejectLexiconProposal(proposalId);
    console.log(`❌ Rejected proposal ${proposalId}`);
  }
} 