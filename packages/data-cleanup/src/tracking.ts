import * as fs from 'fs-extra';
import * as path from 'path';

const TRACKING_DIR = path.join(__dirname, '../data');
const PROCESSED_FILE = path.join(TRACKING_DIR, 'processed.json');

export interface ProcessingTracker {
  processed: string[];
  lastRun: Date;
}

export class TrackingManager {
  private tracker: ProcessingTracker;

  constructor() {
    this.tracker = this.loadTracker();
  }

  private loadTracker(): ProcessingTracker {
    try {
      if (fs.existsSync(PROCESSED_FILE)) {
        const data = fs.readJsonSync(PROCESSED_FILE);
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
    try {
      fs.ensureDirSync(TRACKING_DIR);
      fs.writeJsonSync(PROCESSED_FILE, {
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