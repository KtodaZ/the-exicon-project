import { MongoClient, Db, Collection } from 'mongodb';
import { config } from './config.js';
import { Exercise, CleanupProposal, LexiconItem, LexiconCleanupProposal } from './types.js';

export class DatabaseManager {
  private client: MongoClient;
  private db: Db | null = null;

  constructor() {
    this.client = new MongoClient(config.mongodb.uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(config.mongodb.dbName);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log('Disconnected from MongoDB');
  }

  getExercisesCollection(): Collection<Exercise> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<Exercise>(config.mongodb.exerciseCollection);
  }

  getProposalsCollection(): Collection<CleanupProposal> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<CleanupProposal>(config.mongodb.proposalCollection);
  }

  getLexiconCollection(): Collection<LexiconItem> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<LexiconItem>('lexicon');
  }

  getLexiconProposalsCollection(): Collection<LexiconCleanupProposal> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<LexiconCleanupProposal>('lexicon_cleanup_proposals');
  }

  async getExercisesForCleanup(field: string, limit: number = 10): Promise<Exercise[]> {
    const collection = this.getExercisesCollection();

    // Get exercises that have the field but might need improvement
    const query: any = {};
    query[field] = { $exists: true, $nin: [null, ''] };

    return await collection
      .find(query)
      .limit(limit)
      .toArray();
  }

  async getExercisesForDescriptionGeneration(limit: number = 10, excludeIds: string[] = []): Promise<Exercise[]> {
    const collection = this.getExercisesCollection();

    // Get ALL exercises that have 'text' field and haven't been processed yet
    const query = {
      $and: [
        {
          _id: { $nin: excludeIds } // Exclude already processed exercises
        },
        {
          text: {
            $exists: true,
            $nin: [null, '']
          }
        } // Must have text content
        // Removed description restrictions - process ALL exercises with text
      ]
    };

    return await collection
      .find(query as any)
      .limit(limit)
      .toArray();
  }

  async getExercisesForTagsGeneration(limit: number = 10, excludeIds: string[] = []): Promise<Exercise[]> {
    const collection = this.getExercisesCollection();

    // Get exercises that have missing tags
    const query = {
      $and: [
        {
          _id: { $nin: excludeIds } // Exclude already processed exercises
        },
        {
          text: {
            $exists: true,
            $nin: [null, '']
          }
        }, // Must have text content
        {
          $or: [
            { tags: { $size: 0 } }, // Empty tags array
            { tags: null } // Null tags
          ]
        }
      ]
    };

    return await collection
      .find(query as any)
      .limit(limit)
      .toArray();
  }

  async getExercisesForTextFormatting(limit: number = 10, excludeIds: string[] = []): Promise<Exercise[]> {
    const collection = this.getExercisesCollection();

    // Get ALL exercises that have text content to format
    const query = {
      $and: [
        {
          _id: { $nin: excludeIds } // Exclude already processed exercises
        },
        {
          text: {
            $exists: true,
            $nin: [null, '']
          }
        } // Must have text content
      ]
    };

    return await collection
      .find(query as any)
      .limit(limit)
      .toArray();
  }

  async saveProposal(proposal: CleanupProposal): Promise<void> {
    const collection = this.getProposalsCollection();
    await collection.insertOne(proposal);
  }

  // Exercise reference methods
  async getAllExercises(): Promise<Exercise[]> {
    const collection = this.getExercisesCollection();
    return await collection.find({}).toArray();
  }

  async getCollection(): Promise<Collection<Exercise>> {
    return this.getExercisesCollection();
  }

  async getExercisesForReferenceDetection(limit: number = 10, excludeIds: string[] = []): Promise<Exercise[]> {
    const collection = this.getExercisesCollection();

    // Get exercises that have description or text but no referencedExercises field
    const query = {
      $and: [
        {
          _id: { $nin: excludeIds } // Exclude already processed exercises
        },
        {
          $or: [
            { description: { $exists: true, $ne: '' } },
            { text: { $exists: true, $ne: '' } }
          ]
        },
        {
          referencedExercises: { $exists: false }
        }
      ]
    };

    return await collection
      .find(query as any)
      .limit(limit)
      .toArray();
  }

  async updateExerciseReferences(exerciseId: string, referencedExercises: string[], updatedDescription?: string): Promise<void> {
    const collection = this.getExercisesCollection();

    const updateDoc: any = {
      $set: {
        referencedExercises,
        updated_at: new Date()
      }
    };

    // Update description if provided
    if (updatedDescription !== undefined) {
      updateDoc.$set.description = updatedDescription;
    }

    await collection.updateOne(
      { _id: exerciseId },
      updateDoc
    );
  }

  async createExerciseReferenceProposal(exerciseId: string, referencedExercises: string[], updatedText?: string, confidence: number = 0.8, targetField: 'description' | 'text' = 'description'): Promise<void> {
    // Get the current exercise to compare
    const collection = this.getExercisesCollection();
    const currentExercise = await collection.findOne({ _id: exerciseId });

    if (!currentExercise) {
      throw new Error(`Exercise with id ${exerciseId} not found`);
    }

    // Create proposal for referencedExercises field
    const referenceProposal: CleanupProposal = {
      exerciseId,
      field: 'referencedExercises',
      currentValue: currentExercise.referencedExercises || [],
      proposedValue: referencedExercises,
      reason: `AI-detected exercise references with ${(confidence * 100).toFixed(1)}% confidence`,
      confidence,
      timestamp: new Date(),
      status: 'pending'
    };

    await this.saveProposal(referenceProposal);

    // Create proposal for text/description update if provided
    if (updatedText !== undefined) {
      const currentValue = targetField === 'text' ? currentExercise.text || '' : currentExercise.description || '';
      
      if (updatedText !== currentValue) {
        const textProposal: CleanupProposal = {
          exerciseId,
          field: targetField,
          currentValue,
          proposedValue: updatedText,
          reason: `Updated ${targetField} with markdown exercise references`,
          confidence,
          timestamp: new Date(),
          status: 'pending'
        };

        await this.saveProposal(textProposal);
      }
    }
  }

  async updateReferencedByFields(): Promise<void> {
    const collection = this.getExercisesCollection();

    console.log('🔄 Updating referencedBy fields...');

    // First, clear all existing referencedBy fields
    await collection.updateMany(
      {},
      { $unset: { referencedBy: "" } }
    );

    // Get all exercises with references
    const exercisesWithRefs = await collection.find({
      referencedExercises: { $exists: true, $not: { $size: 0 } }
    }).toArray();

    // Build reverse mapping
    const reverseMap: Map<string, string[]> = new Map();

    for (const exercise of exercisesWithRefs) {
      if (exercise.referencedExercises) {
        for (const refSlug of exercise.referencedExercises) {
          if (!reverseMap.has(refSlug)) {
            reverseMap.set(refSlug, []);
          }
          reverseMap.get(refSlug)!.push(exercise._id);
        }
      }
    }

    // Update referencedBy fields
    for (const [slug, referencingIds] of reverseMap.entries()) {
      // Find the exercise with this urlSlug
      const exercise = await collection.findOne({ urlSlug: slug });
      if (exercise) {
        await collection.updateOne(
          { _id: exercise._id },
          { $set: { referencedBy: referencingIds } }
        );
      }
    }

    console.log(`✅ Updated referencedBy fields for ${reverseMap.size} exercises`);
  }

  async getProposalsByType(field: string, status: 'pending' | 'approved' | 'rejected' = 'pending', limit: number = 50): Promise<CleanupProposal[]> {
    const collection = this.getProposalsCollection();
    return await collection
      .find({ field, status })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  async getExerciseReferenceProposals(status: 'pending' | 'approved' | 'rejected' = 'pending', limit: number = 50, skip: number = 0): Promise<CleanupProposal[]> {
    const collection = this.getProposalsCollection();
    return await collection
      .find({
        field: { $in: ['referencedExercises', 'description', 'text'] },
        status
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async approveProposal(proposalId: string): Promise<void> {
    const proposalsCollection = this.getProposalsCollection();
    const exercisesCollection = this.getExercisesCollection();

    const proposal = await proposalsCollection.findOne({ _id: proposalId });
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    // Apply the proposal to the exercise
    const updateDoc: any = {
      $set: {
        [proposal.field]: proposal.proposedValue,
        updated_at: new Date()
      }
    };

    await exercisesCollection.updateOne(
      { _id: proposal.exerciseId },
      updateDoc
    );

    // Mark proposal as approved
    await proposalsCollection.updateOne(
      { _id: proposalId },
      {
        $set: {
          status: 'approved',
          appliedAt: new Date()
        }
      }
    );
  }

  async rejectProposal(proposalId: string): Promise<void> {
    const collection = this.getProposalsCollection();
    await collection.updateOne(
      { _id: proposalId },
      { $set: { status: 'rejected' } }
    );
  }

  async getExercisesForTextReferenceDetection(limit: number = 10, excludeIds: string[] = []): Promise<Exercise[]> {
    const collection = this.getExercisesCollection();

    // Get exercises that have text content but no referencedExercises field for 'text' processing
    const query = {
      $and: [
        {
          _id: { $nin: excludeIds } // Exclude already processed exercises
        },
        {
          text: {
            $exists: true,
            $ne: ''
          }
        },
        {
          referencedExercises: { $exists: false }
        }
      ]
    };

    return await collection
      .find(query as any)
      .limit(limit)
      .toArray();
  }

  // LEXICON CLEANUP METHODS

  async getLexiconItemsForCleanup(field: string, limit: number = 10, excludeIds: string[] = []): Promise<LexiconItem[]> {
    const collection = this.getLexiconCollection();

    // Get lexicon items that have the field but might need improvement
    const query: any = {
      $and: [
        {
          _id: { $nin: excludeIds } // Exclude already processed items
        },
        {
          [field]: { $exists: true, $nin: [null, ''] }
        }
      ]
    };

    return await collection
      .find(query)
      .limit(limit)
      .toArray();
  }

  async saveLexiconProposal(proposal: LexiconCleanupProposal): Promise<void> {
    const collection = this.getLexiconProposalsCollection();
    await collection.insertOne(proposal);
  }

  async getLexiconProposalsByType(field: string, status: 'pending' | 'approved' | 'rejected' = 'pending', limit: number = 50): Promise<LexiconCleanupProposal[]> {
    const collection = this.getLexiconProposalsCollection();
    return await collection
      .find({ field, status })
      .limit(limit)
      .toArray();
  }

  async approveLexiconProposal(proposalId: string): Promise<void> {
    const proposalsCollection = this.getLexiconProposalsCollection();
    const lexiconCollection = this.getLexiconCollection();
    
    // Import ObjectId for the proposals collection
    const { ObjectId } = await import('mongodb');
    
    // Get the proposal using ObjectId (proposals use ObjectId)
    const proposal = await proposalsCollection.findOne({ _id: new ObjectId(proposalId) });
    if (!proposal) {
      throw new Error(`Proposal with id ${proposalId} not found`);
    }
    
    // Apply the change to the lexicon item (lexicon uses string IDs)
    const updateDoc = {
      $set: {
        [proposal.field]: proposal.proposedValue,
        updatedAt: new Date()
      }
    };
    
    await lexiconCollection.updateOne(
      { _id: proposal.lexiconId }, // lexiconId is a string
      updateDoc
    );
    
    // Mark proposal as approved and applied (proposals use ObjectId)
    await proposalsCollection.updateOne(
      { _id: new ObjectId(proposalId) },
      {
        $set: {
          status: 'applied' as const,
          appliedAt: new Date()
        }
      }
    );
  }

  async rejectLexiconProposal(proposalId: string): Promise<void> {
    const collection = this.getLexiconProposalsCollection();
    await collection.updateOne(
      { _id: proposalId as any },
      { $set: { status: 'rejected' as const } }
    );
  }
}