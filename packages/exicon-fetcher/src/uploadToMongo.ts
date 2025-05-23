import { MongoClient, Collection } from 'mongodb';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { SimplifiedExiconItem } from './types';

// Load environment variables
dotenv.config();

// MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'exicon';
const COLLECTION_NAME = 'exercises';

// File paths
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_INPUT_FILE = path.join(OUTPUT_DIR, 'all-exicon-items.json');

// For alias handling
interface AliasObject {
  name: string;
  id: string;
}

// For MongoDB document input
interface ExiconInput {
  external_id: string;
  name?: string;
  description?: string;
  categories?: string;
  text?: string;
  video_url?: string | null;
  image_url?: string | null;
  publishedAt?: string;
  urlSlug?: string;
  postURL?: string;
  aliases?: Array<string | { name: string; id?: string }>;
  tags?: string[];
  confidence?: number;
  quality?: number;
  author?: string;
  difficulty?: number;
}

// MongoDB document structure
interface MongoExiconItem {
  _id: string;
  external_id: string;
  name: string;
  description: string;
  categories: string;
  text: string;
  video_url: string | null;
  image_url: string | null;
  publishedAt: string;
  urlSlug: string;
  postURL: string;
  aliases: AliasObject[];
  tags: string[];
  confidence: number;
  quality: number;
  author: string;
  difficulty: number;
  createdAt: Date;
  updatedAt: Date;
}

async function connectToMongo(): Promise<Collection<MongoExiconItem>> {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoExiconItem>(COLLECTION_NAME);
    
    // Create indexes (excluding _id which is automatically indexed)
    await collection.createIndex({ name: 'text', description: 'text', text: 'text' });
    await collection.createIndex({ categories: 1 });
    await collection.createIndex({ tags: 1 });
    
    return collection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

async function uploadToMongo(inputFilePath?: string): Promise<void> {
  const actualInputFile = inputFilePath || DEFAULT_INPUT_FILE;
  
  try {
    console.log('Starting uploadToMongo()');
    console.log(`Reading enhanced data from: ${actualInputFile}`);
    
    // Read the input JSON file
    const items = await fs.readJSON(actualInputFile);
    console.log(`Found ${items.length} items to upload`);
    
    // Connect to MongoDB
    const collection = await connectToMongo();
    
    // Prepare items for MongoDB
    const now = new Date();
    const mongoItems = items.map((item: ExiconInput) => {
      // Handle aliases based on its type
      let aliases: AliasObject[] = [];
      if (Array.isArray(item.aliases)) {
        aliases = item.aliases.map((alias: any) => {
          if (typeof alias === 'string') {
            return {
              name: alias,
              id: alias.toLowerCase().replace(/\s+/g, '-')
            };
          } else if (typeof alias === 'object' && alias !== null) {
            return {
              name: alias.name || '',
              id: alias.id || (alias.name ? alias.name.toLowerCase().replace(/\s+/g, '-') : '')
            };
          }
          return { name: '', id: '' };
        });
      }
      
      return {
        _id: item.external_id,
        external_id: item.external_id,
        name: item.name || '',
        description: item.description || '',
        categories: item.categories || '',
        text: item.text || '',
        video_url: item.video_url || null,
        image_url: item.image_url || null,
        publishedAt: item.publishedAt || '',
        urlSlug: item.urlSlug || '',
        postURL: item.postURL || '',
        aliases: aliases,
        tags: item.tags || [],
        confidence: item.confidence || 0,
        quality: item.quality || 0,
        author: item.author || 'N/A',
        difficulty: item.difficulty || 0,
        createdAt: now,
        updatedAt: now
      };
    });
    
    // Track statistics
    let upserted = 0;
    let errors = 0;
    
    // Process items in batches of 100
    const batchSize = 100;
    for (let i = 0; i < mongoItems.length; i += batchSize) {
      const batch = mongoItems.slice(i, i + batchSize);
      const originalBatch = items.slice(i, i + batchSize);
      const operations = batch.map((item: MongoExiconItem, index: number) => {
        const originalItem = originalBatch[index];
        return {
          updateOne: {
            filter: { _id: item._id },
            update: { 
              $set: Object.fromEntries([
                ['updatedAt', now],
                ...(originalItem.name !== undefined ? [['name', item.name]] : []),
                ...(originalItem.description !== undefined ? [['description', item.description]] : []),
                ...(originalItem.categories !== undefined ? [['categories', item.categories]] : []),
                ...(originalItem.aliases !== undefined ? [['aliases', item.aliases]] : []),
                ...(originalItem.tags !== undefined ? [['tags', item.tags]] : []),
                ...(originalItem.confidence !== undefined ? [['confidence', item.confidence]] : []),
                ...(originalItem.quality !== undefined ? [['quality', item.quality]] : []),
                ...(originalItem.author !== undefined ? [['author', item.author]] : []),
                ...(originalItem.difficulty !== undefined ? [['difficulty', item.difficulty]] : []),
                ...(originalItem.text !== undefined ? [['text', item.text]] : []),
                ...(originalItem.video_url !== undefined ? [['video_url', item.video_url]] : []),
                ...(originalItem.image_url !== undefined ? [['image_url', item.image_url]] : []),
                ...(originalItem.publishedAt !== undefined ? [['publishedAt', item.publishedAt]] : []),
                ...(originalItem.urlSlug !== undefined ? [['urlSlug', item.urlSlug]] : []),
                ...(originalItem.postURL !== undefined ? [['postURL', item.postURL]] : [])
              ]),
              $setOnInsert: {
                _id: item._id,
                external_id: item.external_id,
                createdAt: now
              }
            },
            upsert: true
          }
        };
      });
      
      try {
        const result = await collection.bulkWrite(operations);
        upserted += result.upsertedCount || 0;
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(mongoItems.length / batchSize)}`);
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        errors++;
      }
    }
    
    console.log('\nUpload completed!');
    console.log(`Total items processed: ${mongoItems.length}`);
    console.log(`Items upserted: ${upserted}`);
    console.log(`Errors encountered: ${errors}`);
    
  } catch (error) {
    console.error('Error in uploadToMongo:', error);
    throw error;
  }
}

// Execute the main function if this file is run directly
if (require.main === module) {
  uploadToMongo().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default uploadToMongo; 