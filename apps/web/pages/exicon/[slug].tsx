import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { TagBadge } from '@/components/ui/tag-badge';
import { Button } from '@/components/ui/button';
import { ExerciseDetail } from '@/lib/models/exercise';
import { ExerciseCard } from '@/components/exercise-card';
import { ChevronLeft } from 'lucide-react';
import { VideoPlayer } from '@/components/video-player';
import { getExerciseBySlug } from '@/lib/api/exercise';

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
  
  // Determine how many exercises to show based on screen size
  const getExerciseCount = () => {
    if (!width) return 8; // Default for SSR
    if (width >= 1280) return 8; // XL: 4x2 = 8
    if (width >= 1024) return 6; // LG: 3x2 = 6
    return 6; // Smaller screens show 6
  };

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
    tags, 
    description, 
    text, 
    video_url, 
    image_url,
    author, 
    similarExercises 
  } = exercise;

  const exerciseCount = getExerciseCount();

  return (
    <>
      <Head>
        <title>{name} | Exicon</title>
        <meta name="description" content={description} />
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <div className="container mx-auto px-4 py-8">
          {/* Back button */}
          <Link href="/exicon" className="inline-flex items-center mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Exercises
          </Link>

          {/* Exercise header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {name}
            </h1>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map(tag => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  href={`/exicon?tags=${encodeURIComponent(tag)}`}
                />
              ))}
            </div>
            
            {/* Video or Image */}
            <div className="max-w-2xl mx-auto bg-gray-200 dark:bg-gray-800 rounded-lg aspect-video mb-8 flex items-center justify-center overflow-hidden shadow-lg">
              {video_url ? (
                <VideoPlayer src={video_url} />
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
            
            {/* Exercise content */}
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Description
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 mb-8 whitespace-pre-line">
                  {text}
                </p>
              </div>
              
              {/* Author */}
              {author && author !== 'N/A' && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Author:</span> {author}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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