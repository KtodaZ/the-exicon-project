import { ObjectId } from 'mongodb';

export interface Exercise {
  _id: string;
  name: string;
  description?: string;
  text?: string;
  instructions?: string;
  tags?: string[];
  author?: string;
  created_at?: Date;
  updated_at?: Date;
  status?: string;
  urlSlug?: string;                // URL-friendly slug from the main database
  // Exercise reference fields
  referencedExercises?: string[]; // Array of slugs that this exercise references
  referencedBy?: string[];        // Array of slugs that reference this exercise
  slug?: string;                  // URL-friendly slug for this exercise
}

// Lexicon item interface for cleanup
export interface LexiconItem {
  _id: string;
  title: string;
  description: string;
  urlSlug: string;
  rawHTML: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CleanupProposal {
  _id?: string;
  exerciseId: string;
  field: string;
  currentValue: any;
  proposedValue: any;
  reason: string;
  confidence: number;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  appliedAt?: Date;
}

// Lexicon cleanup proposal interface - uses ObjectId like MongoDB
export interface LexiconCleanupProposal {
  _id?: ObjectId;
  lexiconId: string;
  field: string;
  currentValue: any;
  proposedValue: any;
  reason: string;
  confidence: number;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  appliedAt?: Date;
}

export interface CleanupConfig {
  field: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  batchSize?: number;
}

export interface CleanupResult {
  success: boolean;
  proposal?: CleanupProposal;
  error?: string;
}

// Lexicon cleanup result interface
export interface LexiconCleanupResult {
  success: boolean;
  proposal?: LexiconCleanupProposal;
  error?: string;
}