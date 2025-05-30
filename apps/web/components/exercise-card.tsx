import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseListItem } from "@/lib/models/exercise";
import { TagBadge } from "@/components/ui/tag-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ExercisePlaceholder } from './ui/exercise-placeholder';
import { ExerciseTextRenderer } from './ui/exercise-text-renderer';
import { useRouter } from 'next/router';

interface ExerciseCardProps {
  exercise: ExerciseListItem;
  onTagClick?: (tag: string) => void;
  className?: string;
}

export function ExerciseCard({ exercise, onTagClick, className }: ExerciseCardProps) {
  const { name, description, tags, urlSlug, difficulty, video_url, image_url } = exercise;
  const router = useRouter();

  // Check if this is one of the placeholder image URLs or if image_url is null/empty
  const shouldShowPlaceholder = image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6693d8938e395d22def508d7.png' ||
    image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6698299f33f2d9f5c28dcb76.png' ||
    !image_url;

  // Function to determine difficulty level text and color
  const getDifficultyInfo = (difficultyValue: number) => {
    if (difficultyValue <= 0.3) return { text: "Beginner", className: "text-green-600" };
    if (difficultyValue <= 0.6) return { text: "Intermediate", className: "text-yellow-600" };
    return { text: "Advanced", className: "text-brand-red" };
  };

  const difficultyInfo = getDifficultyInfo(difficulty);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if the click is on a link or button
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button')) {
      return;
    }
    router.push(`/exicon/${urlSlug}`);
  };

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    console.log('Tag clicked:', tag);
    console.log('Stopping propagation');
    e.stopPropagation();
    e.preventDefault();
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  return (
    <Card className={cn("h-full transition-all hover:shadow-md overflow-visible", className)} style={{ position: 'relative' }}>
      <div 
        className="cursor-pointer relative overflow-visible"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold line-clamp-2 mb-4">{name}</CardTitle>
          <p className={cn("text-sm font-medium mb-3", difficultyInfo.className)}>
            {difficultyInfo.text}
          </p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-md mb-5 flex items-center justify-center overflow-hidden">
            {shouldShowPlaceholder ? (
              <ExercisePlaceholder title={name} tags={tags} />
            ) : image_url ? (
              <Image
                src={image_url}
                alt={name}
                className="object-cover w-full h-full"
                width={280}
                height={158}
              />
            ) : (
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 00-2-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
        </CardContent>
        <CardContent className="pt-0 pb-4" style={{ overflow: 'visible', position: 'relative' }}>
          <ExerciseTextRenderer 
            text={description} 
            className="text-gray-600 dark:text-gray-400 text-sm"
            showTooltips={false}
          />
        </CardContent>
      </div>
      <CardFooter className="flex flex-wrap gap-2 pt-0">
        {tags.map((tag) => (
          <TagBadge
            key={tag}
            tag={tag}
            onClick={onTagClick ? (e) => handleTagClick(tag, e) : undefined}
          />
        ))}
      </CardFooter>
    </Card>
  );
}