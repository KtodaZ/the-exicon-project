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
    
    // Get exercises that have 'text' field but either no description or poor description
    // AND haven't been processed yet
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
            { description: { $exists: false } }, // No description field
            { description: { $eq: null } }, // Null description
            { description: { $eq: '' } }, // Empty description
            { description: { $regex: '^.{0,20}$' } } // Very short description (less than 20 chars)
          ]
        }
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