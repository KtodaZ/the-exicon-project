import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseListItem } from "@/lib/models/exercise";
import { TagBadge } from "@/components/ui/tag-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ExerciseCardProps {
  exercise: ExerciseListItem;
  onTagClick?: (tag: string) => void;
  className?: string;
}

export function ExerciseCard({ exercise, onTagClick, className }: ExerciseCardProps) {
  const { name, description, tags, urlSlug, difficulty } = exercise;
  
  // Function to determine difficulty level text and color
  const getDifficultyInfo = (difficultyValue: number) => {
    if (difficultyValue <= 0.3) return { text: "Beginner", className: "text-green-600" };
    if (difficultyValue <= 0.6) return { text: "Intermediate", className: "text-yellow-600" };
    return { text: "Advanced", className: "text-brand-red" };
  };
  
  const difficultyInfo = getDifficultyInfo(difficulty);

  return (
    <Card className={cn("h-full transition-all hover:shadow-md", className)}>
      <Link href={`/exicon/${urlSlug}`} className="block h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold line-clamp-2">{name}</CardTitle>
          <p className={cn("text-sm font-medium", difficultyInfo.className)}>
            {difficultyInfo.text}
          </p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-md mb-4 flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 text-gray-400 dark:text-gray-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
              />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400 line-clamp-3 text-sm">
            {description}
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 pt-0">
          {tags.slice(0, 5).map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              variant="outline"
              onClick={onTagClick ? (e) => {
                e.preventDefault();
                onTagClick(tag);
              } : undefined}
            />
          ))}
          {tags.length > 5 && (
            <span className="text-xs text-gray-500">+{tags.length - 5} more</span>
          )}
        </CardFooter>
      </Link>
    </Card>
  );
}