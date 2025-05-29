import { DatabaseManager } from './database.js';
import { OpenAIClient } from './openai-client.js';
import { CleanupConfig, CleanupResult, CleanupProposal, Exercise } from './types.js';
import { config } from './config.js';
import { TrackingManager } from './tracking.js';

export class CleanupEngine {
  private db: DatabaseManager;
  private openai: OpenAIClient;
  private tracker: TrackingManager;

  constructor() {
    this.db = new DatabaseManager();
    this.openai = new OpenAIClient();
    this.tracker = new TrackingManager();
  }

  async initialize(): Promise<void> {
    await this.db.connect();
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }

  async runCleanup(cleanupConfig: CleanupConfig): Promise<CleanupResult[]> {
    const batchSize = cleanupConfig.batchSize || config.cleanup.defaultBatchSize;
    
    // Get tracking stats
    const stats = this.tracker.getStats();
    console.log(`Already processed: ${stats.totalProcessed} exercises`);
    console.log(`Last run: ${stats.lastRun}`);
    
    // Get exercises based on cleanup type
    let exercises: Exercise[];
    if (cleanupConfig.field === 'description') {
      exercises = await this.db.getExercisesForDescriptionGeneration(batchSize, this.tracker.getProcessedIds());
    } else if (cleanupConfig.field === 'tags') {
      exercises = await this.db.getExercisesForTagsGeneration(batchSize, this.tracker.getProcessedIds());
    } else if (cleanupConfig.field === 'text') {
      exercises = await this.db.getExercisesForTextFormatting(batchSize, this.tracker.getProcessedIds());
    } else {
      exercises = await this.db.getExercisesForCleanup(cleanupConfig.field, batchSize);
    }
    
    console.log(`Processing ${exercises.length} exercises for field: ${cleanupConfig.field}`);
    
    if (exercises.length === 0) {
      console.log('No new exercises to process!');
      return [];
    }
    
    const results: CleanupResult[] = [];
    
    for (const exercise of exercises) {
      try {
        const result = await this.processExercise(exercise, cleanupConfig);
        results.push(result);
        
        if (result.success && result.proposal) {
          console.log(`✓ Proposal created for "${exercise.name}"`);
          // Mark as processed even if proposal created
          this.tracker.markAsProcessed(exercise._id);
        } else if (result.error) {
          console.log(`✗ Error processing "${exercise.name}": ${result.error}`);
          // Still mark as processed to avoid retrying failed items
          this.tracker.markAsProcessed(exercise._id);
        }
        
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          error: errorMessage
        });
        console.log(`✗ Failed to process "${exercise.name}": ${errorMessage}`);
        // Mark as processed to avoid retrying
        this.tracker.markAsProcessed(exercise._id);
      }
    }
    
    return results;
  }

  private async processExercise(exercise: Exercise, cleanupConfig: CleanupConfig): Promise<CleanupResult> {
    try {
      let sourceValue: any;
      let currentValue: any;
      
      if (cleanupConfig.field === 'description') {
        // For description generation, use 'text' as source and 'description' as target
        sourceValue = exercise.text || exercise.description;
        currentValue = exercise.description;
        
        if (!sourceValue || sourceValue === '') {
          return {
            success: false,
            error: 'No text content available to generate description from'
          };
        }
      } else {
        // For other fields, use the field itself
        currentValue = exercise[cleanupConfig.field as keyof Exercise];
        sourceValue = currentValue;
        
        if (!currentValue || currentValue === '') {
          return {
            success: false,
            error: `Field "${cleanupConfig.field}" is empty or missing`
          };
        }
      }

      const aiResult = await this.openai.generateCleanup(exercise, cleanupConfig, sourceValue);
      
      // For description generation, we want to create new descriptions even if current exists
      // For other fields, only suggest changes if meaningfully different
      if (cleanupConfig.field !== 'description') {
        if (aiResult.value === currentValue || aiResult.confidence < 0.5) {
          return {
            success: false,
            error: 'No meaningful improvement suggested'
          };
        }
      } else {
        // For description generation, check confidence but allow overwrites
        if (aiResult.confidence < 0.5) {
          return {
            success: false,
            error: 'Low confidence in generated description'
          };
        }
      }

      const proposal: CleanupProposal = {
        exerciseId: exercise._id,
        field: cleanupConfig.field,
        currentValue: currentValue || '',
        proposedValue: aiResult.value,
        reason: aiResult.reason,
        confidence: aiResult.confidence,
        timestamp: new Date(),
        status: 'pending'
      };

      if (config.cleanup.autoApprove) {
        // Auto-apply all proposals when in auto mode
        proposal.status = 'approved';
        await this.db.saveProposal(proposal);
        
        // Apply immediately to MongoDB
        const updateQuery: any = {};
        updateQuery[cleanupConfig.field] = proposal.proposedValue;
        
        const exercisesCollection = this.db.getExercisesCollection();
        await exercisesCollection.updateOne(
          { _id: proposal.exerciseId } as any,
          { $set: updateQuery }
        );
        
        console.log(`  → Applied to MongoDB (confidence: ${(proposal.confidence * 100).toFixed(1)}%)`);
      } else {
        // Save for manual review
        await this.db.saveProposal(proposal);
        console.log(`  → Saved for review (confidence: ${(proposal.confidence * 100).toFixed(1)}%)`);
      }

      return {
        success: true,
        proposal: proposal
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

}