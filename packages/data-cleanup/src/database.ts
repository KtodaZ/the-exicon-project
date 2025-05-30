import { MongoClient, Db, Collection } from 'mongodb';
import { config } from './config.js';
import { Exercise, CleanupProposal } from './types.js';

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
      // Find the exercise with this slug (we'll need to implement slug generation)
      const exercise = await collection.findOne({ slug });
      if (exercise) {
        await collection.updateOne(
          { _id: exercise._id },
          { $set: { referencedBy: referencingIds } }
        );
      }
    }
    
    console.log(`✅ Updated referencedBy fields for ${reverseMap.size} exercises`);
  }

  async generateAndStoreSlugs(): Promise<void> {
    const collection = this.getExercisesCollection();
    
    console.log('🏷️  Generating and storing slugs for all exercises...');
    
    const exercises = await collection.find({}).toArray();
    
    for (const exercise of exercises) {
      const slug = this.generateSlug(exercise.name);
      await collection.updateOne(
        { _id: exercise._id },
        { $set: { slug } }
      );
    }
    
    console.log(`✅ Generated slugs for ${exercises.length} exercises`);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single
  }

}