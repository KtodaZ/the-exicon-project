import { useState, useEffect } from 'react';
import { BottomSheet } from './bottom-sheet';
import { ExerciseListItem } from '@/lib/models/exercise';
import { Badge } from './badge';
import { ExercisePlaceholder } from './exercise-placeholder';
import { Button } from './button';
import Image from 'next/image';
import Link from 'next/link';

interface ExerciseBottomSheetProps {
  slug: string;
  children: React.ReactNode;
  className?: string;
}

export function ExerciseBottomSheet({ slug, children, className }: ExerciseBottomSheetProps) {
  const [exercise, setExercise] = useState<ExerciseListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch exercise data when sheet opens
  useEffect(() => {
    if (isOpen && !exercise && !loading && !error) {
      setLoading(true);

      fetch(`/api/exercises/by-slug/${slug}?preview=true`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch exercise');
          }
          return response.json();
        })
        .then(data => {
          if (data.success && data.exercise) {
            setExercise(data.exercise);
          } else {
            setError(true);
          }
        })
        .catch(() => {
          setError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, slug, exercise, loading, error]);

  const getDifficultyInfo = (difficulty: number) => {
    if (difficulty <= 0.3) return { text: "Beginner", className: "text-green-600" };
    if (difficulty <= 0.6) return { text: "Intermediate", className: "text-yellow-600" };
    return { text: "Advanced", className: "text-[#AD0C02]" };
  };

  // Check if we should show placeholder
  const shouldShowPlaceholder = !exercise?.image_url ||
    exercise.image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6693d8938e395d22def508d7.png' ||
    exercise.image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6698299f33f2d9f5c28dcb76.png';

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
  };

  return (
    <>
      <span
        className={`underline hover:text-[#AD0C02] transition-colors cursor-pointer ${className}`}
        onClick={handleTriggerClick}
      >
        {children}
      </span>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={exercise?.name}
      >
        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Could not load exercise preview
            </p>
            <Link href={`/exicon/${slug}`}>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                View Exercise Page
              </Button>
            </Link>
          </div>
        ) : exercise ? (
          <div className="pb-6">
            {/* Difficulty Badge */}
            <div className="px-6 pb-4">
              <Badge
                variant="outline"
                className={`${getDifficultyInfo(exercise.difficulty).className} border-current text-sm px-3 py-1 font-medium`}
              >
                {getDifficultyInfo(exercise.difficulty).text}
              </Badge>
            </div>

            {/* Image/Placeholder */}
            <div className="aspect-video mx-6 mb-6 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 not-prose">
              {shouldShowPlaceholder ? (
                <ExercisePlaceholder title={exercise.name} tags={exercise.tags} />
              ) : exercise.image_url ? (
                <Image
                  src={exercise.image_url}
                  alt={exercise.name}
                  className="object-cover w-full h-full not-prose"
                  width={400}
                  height={225}
                />
              ) : null}
            </div>

            {/* Description */}
            {exercise.description && (
              <div className="px-6 mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {exercise.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {exercise.tags && exercise.tags.length > 0 && (
              <div className="px-6 mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {exercise.tags.slice(0, 6).map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2 py-1 font-medium"
                    >
                      {tag.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Badge>
                  ))}
                  {exercise.tags.length > 6 && (
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400 font-medium"
                    >
                      +{exercise.tags.length - 6}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="px-6">
              <Link href={`/exicon/${slug}`}>
                <Button className="w-full" onClick={() => setIsOpen(false)}>
                  View Full Exercise
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
} 