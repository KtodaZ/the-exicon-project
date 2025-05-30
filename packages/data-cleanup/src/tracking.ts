import * as fs from 'fs-extra';
import * as path from 'path';

const TRACKING_DIR = path.join(__dirname, '../data');

// Support multiple tracking files for different cleanup types
function getTrackingFile(cleanupType: string = 'default'): string {
  return path.join(TRACKING_DIR, `processed-${cleanupType}.json`);
}

export interface ProcessingTracker {
  processed: string[];
  lastRun: Date;
}

export class TrackingManager {
  private tracker: ProcessingTracker;
  private cleanupType: string;

  constructor(cleanupType: string = 'default') {
    this.cleanupType = cleanupType;
    this.tracker = this.loadTracker();
  }

  private loadTracker(): ProcessingTracker {
    const file = getTrackingFile(this.cleanupType);
    try {
      if (fs.existsSync(file)) {
        const data = fs.readJsonSync(file);
        return {
          processed: data.processed || [],
          lastRun: new Date(data.lastRun || new Date())
        };
      }
    } catch (error) {
      console.warn('Could not load tracking file, starting fresh');
    }
    
    return {
      processed: [],
      lastRun: new Date()
    };
  }

  private saveTracker(): void {
    const file = getTrackingFile(this.cleanupType);
    try {
      fs.ensureDirSync(TRACKING_DIR);
      fs.writeJsonSync(file, {
        processed: this.tracker.processed,
        lastRun: this.tracker.lastRun
      }, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save tracking file:', error);
    }
  }

  isProcessed(exerciseId: string): boolean {
    return this.tracker.processed.includes(exerciseId);
  }

  markAsProcessed(exerciseId: string): void {
    if (!this.tracker.processed.includes(exerciseId)) {
      this.tracker.processed.push(exerciseId);
      this.tracker.lastRun = new Date();
      this.saveTracker();
    }
  }

  getProcessedIds(): string[] {
    return [...this.tracker.processed];
  }

  getStats(): { totalProcessed: number; lastRun: Date } {
    return {
      totalProcessed: this.tracker.processed.length,
      lastRun: this.tracker.lastRun
    };
  }

  reset(): void {
    this.tracker = {
      processed: [],
      lastRun: new Date()
    };
    this.saveTracker();
  }
}

// Helper functions for different cleanup types
export async function loadProcessedIds(cleanupType: string): Promise<string[]> {
  const file = getTrackingFile(cleanupType);
  try {
    if (fs.existsSync(file)) {
      const data = fs.readJsonSync(file);
      return data.processed || [];
    }
  } catch (error) {
    console.warn(`Could not load tracking file for ${cleanupType}, starting fresh`);
  }
  return [];
}

export async function saveProcessedId(cleanupType: string, exerciseId: string): Promise<void> {
  const file = getTrackingFile(cleanupType);
  
  try {
    let data: ProcessingTracker = {
      processed: [],
      lastRun: new Date()
    };
    
    if (fs.existsSync(file)) {
      const existing = fs.readJsonSync(file);
      data.processed = existing.processed || [];
    }
    
    if (!data.processed.includes(exerciseId)) {
      data.processed.push(exerciseId);
      data.lastRun = new Date();
      
      fs.ensureDirSync(TRACKING_DIR);
      fs.writeJsonSync(file, data, { spaces: 2 });
    }
  } catch (error) {
    console.error(`Failed to save tracking for ${cleanupType}:`, error);
  }
}

export async function getTrackingStats(cleanupType: string): Promise<{ totalProcessed: number; lastRun: Date | null }> {
  const file = getTrackingFile(cleanupType);
  
  try {
    if (fs.existsSync(file)) {
      const data = fs.readJsonSync(file);
      return {
        totalProcessed: (data.processed || []).length,
        lastRun: data.lastRun ? new Date(data.lastRun) : null
      };
    }
  } catch (error) {
    console.warn(`Could not load stats for ${cleanupType}`);
  }
  
  return {
    totalProcessed: 0,
    lastRun: null
  };
}