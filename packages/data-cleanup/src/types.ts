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