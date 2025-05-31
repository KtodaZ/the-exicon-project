export interface CombinedSearchResult {
  lexicon: {
    items: Array<{
      _id: string;
      title: string;
      description: string;
      urlSlug: string;
      type: 'lexicon';
    }>;
    totalCount: number;
  };
  exercises: {
    items: Array<{
      _id: string;
      name: string;
      description: string;
      slug: string;
      type: 'exercise';
    }>;
    totalCount: number;
  };
} 