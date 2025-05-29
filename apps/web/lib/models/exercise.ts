export interface Alias {
  name: string;
  id: string;
}

export type ExerciseStatus = 'draft' | 'submitted' | 'active' | 'archived';

export interface Exercise {
  _id: string;
  aliases: Alias[];
  author: string;
  confidence: number;
  createdAt: {
    $date: {
      $numberLong: string;
    }
  };
  description: string;
  difficulty: number;
  name: string;
  postURL: string;
  quality: number;
  tags: string[];
  text: string;
  updatedAt: {
    $date: {
      $numberLong: string;
    }
  };
  urlSlug: string;
  video_url: string | null;
  image_url?: string | null;
  status: ExerciseStatus;
  submittedBy?: string;
  submittedAt?: Date | string;
  approvedBy?: string;
  approvedAt?: Date | string;
}

export interface ExerciseListItem {
  _id: string;
  name: string;
  description: string;
  tags: string[];
  urlSlug: string;
  difficulty: number;
  video_url?: string | null;
  image_url?: string | null;
  status: ExerciseStatus;
  submittedBy?: string;
  submittedAt?: Date | string;
}

export interface ExerciseDetail extends Exercise {
  similarExercises?: ExerciseListItem[];
  authorName?: string;
}