import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { TagBadge } from '@/components/ui/tag-badge';
import { Button } from '@/components/ui/button';
import { ExerciseDetail } from '@/lib/models/exercise';
import { ExerciseCard } from '@/components/exercise-card';
import { ChevronLeft } from 'lucide-react';
import { VideoPlayer } from '@/components/video-player';
import { ExercisePlaceholderLarge } from '@/components/ui/exercise-placeholder-large';
import { ExerciseTextRenderer } from '@/components/ui/exercise-text-renderer';
import { getExerciseBySlug } from '@/lib/api/exercise';
import { Settings } from 'lucide-react';

// Helper function to convert text to title case
function toTitleCase(str: string): string {
  // Articles, prepositions, and conjunctions that should remain lowercase (unless first word)
  const smallWords = [
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'is', 'it',
    'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'
  ];

  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word, or if not a small word
      if (index === 0 || !smallWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

// Custom hook to get window size
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: undefined as number | undefined,
    height: undefined as number | undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

interface ExerciseDetailPageProps {
  exercise: ExerciseDetail;
}

export default function ExerciseDetailPage({ exercise }: ExerciseDetailPageProps) {
  const { width } = useWindowSize();
  const { data: session } = useSession();
  const { data: permissions } = usePermissions();

  // Determine how many exercises to show based on screen size
  const getExerciseCount = () => {
    if (!width) return 8; // Default for SSR
    if (width >= 1280) return 8; // XL: 4x2 = 8
    if (width >= 1024) return 6; // LG: 3x2 = 6
    return 6; // Smaller screens show 6
  };

  // Determine if user can edit this exercise
  const canEdit = session?.user && (
    // User is owner of the exercise
    exercise.submittedBy === session.user.id ||
    // User has admin/maintainer permissions
    permissions?.canEditExercise
  );

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Exercise not found</h1>
          <Link href="/exicon">
            <Button variant="outline">Back to Exercises</Button>
          </Link>
        </div>
      </div>
    );
  }

  const {
    name,
    aliases,
    tags,
    description,
    text,
    video_url,
    image_url,
    author,
    authorName,
    similarExercises
  } = exercise;

  const exerciseCount = getExerciseCount();

  // Check if this is one of the placeholder image URLs or null
  const shouldShowPlaceholder = !image_url ||
    image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6693d8938e395d22def508d7.png' ||
    image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6698299f33f2d9f5c28dcb76.png';

  return (
    <>
      <Head>
        <title>{name} | Exicon</title>
        <meta name="description" content={description} />
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <div className="container mx-auto py-8">
          {/* Back button */}
          <Link href="/exicon" className="inline-flex items-center mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Exercises
          </Link>

          {/* Exercise header */}
          <div className="mb-8 pt-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {name}
                </h1>
                {aliases && aliases.length > 0 && (
                  <div className="mt-2">
                    {(() => {
                      const uniqueAliases = aliases.filter(alias =>
                        alias.name.trim().toLowerCase() !== name.trim().toLowerCase()
                      );
                      return uniqueAliases.length > 0 && (
                        <span className="text-lg text-gray-600 dark:text-gray-400">
                          Also known as: {uniqueAliases.map(alias => toTitleCase(alias.name)).join(', ')}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
              {canEdit && (
                <Link href={`/edit-exercise/${exercise._id}`}>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Edit Exercise
                  </Button>
                </Link>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-12">
              {tags.map(tag => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  href={`/exicon?tags=${encodeURIComponent(tag)}`}
                />
              ))}
            </div>
          </div>

          {/* Two-column layout on large screens, stacked on mobile */}
          <div className="grid lg:grid-cols-2 lg:gap-12 gap-8 mb-12">
            {/* Left column: Media */}
            <div className="lg:order-1">
              <div className="max-w-[800px] mx-auto bg-gray-200 dark:bg-gray-800 rounded-lg aspect-video flex items-center justify-center overflow-hidden shadow-lg">
                {video_url ? (
                  <VideoPlayer src={video_url} posterImage={image_url || undefined} />
                ) : shouldShowPlaceholder ? (
                  <ExercisePlaceholderLarge title={name} tags={tags} />
                ) : image_url ? (
                  <Image
                    src={image_url}
                    alt={name}
                    className="object-cover w-full h-full"
                    width={800}
                    height={450}
                  />
                ) : (
                  <div className="text-gray-400 dark:text-gray-600">
                    No media available
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Content and meta */}
            <div className="lg:order-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Description
              </h2>
              <div className="prose dark:prose-invert max-w-[65ch]">
                <ExerciseTextRenderer
                  text={text || description || ''}
                  className="text-gray-700 dark:text-gray-300 mb-8 text-lg leading-relaxed"
                />
              </div>

              {/* Author */}
              {(authorName || (author && author !== 'N/A')) && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Author:</span> {authorName || author}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Similar exercises */}
          {similarExercises && similarExercises.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                See Also
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-8">
                {similarExercises.slice(0, exerciseCount).map(exercise => (
                  <ExerciseCard key={exercise._id} exercise={exercise} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string };

  console.log('getServerSideProps called with slug:', slug);

  try {
    // Directly call the database function instead of making an HTTP request
    const exercise = await getExerciseBySlug(slug);

    console.log('Exercise fetched successfully:', exercise?.name || 'null');

    return {
      props: {
        exercise: exercise ? JSON.parse(JSON.stringify(exercise)) : null
      }
    };
  } catch (error) {
    console.error(`Error fetching exercise with slug ${slug}:`, error);

    return {
      props: { exercise: null }
    };
  }
};