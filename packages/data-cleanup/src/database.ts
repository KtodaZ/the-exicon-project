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

}