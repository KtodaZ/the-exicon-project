export interface Alias {
  name: string;
  id: string;
}

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
}

export interface ExerciseListItem {
  _id: string;
  name: string;
  description: string;
  tags: string[];
  urlSlug: string;
  difficulty: number;
}

export interface ExerciseDetail extends Exercise {
  similarExercises?: ExerciseListItem[];
}