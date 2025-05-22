import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { TagBadge } from '@/components/ui/tag-badge';
import { Button } from '@/components/ui/button';
import { ExerciseDetail } from '@/lib/models/exercise';
import { ExerciseCard } from '@/components/exercise-card';
import { ChevronLeft } from 'lucide-react';

interface ExerciseDetailPageProps {
  exercise: ExerciseDetail;
}

export default function ExerciseDetailPage({ exercise }: ExerciseDetailPageProps) {
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
    author, 
    similarExercises 
  } = exercise;

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
            
            {/* Video */}
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg aspect-video mb-8 flex items-center justify-center overflow-hidden">
              {video_url ? (
                <video 
                  controls 
                  className="w-full h-full"
                  poster="/video-placeholder.png"
                >
                  <source src={video_url} type="video/quicktime" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-center p-8">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" 
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
                  <p className="text-gray-500 dark:text-gray-400">
                    No video available for this exercise
                  </p>
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
                {similarExercises.map(exercise => (
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
  
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/exercises/${slug}`
    );
    
    if (!res.ok) {
      return {
        props: { exercise: null }
      };
    }
    
    const exercise = await res.json();
    
    return {
      props: { exercise }
    };
  } catch (error) {
    console.error(`Error fetching exercise with slug ${slug}:`, error);
    
    return {
      props: { exercise: null }
    };
  }
};