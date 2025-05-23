import React from 'react';

interface VideoPlayerProps {
  src: string | null;
  className?: string;
  posterImage?: string;
}

/**
 * VideoPlayer component that handles multiple video formats
 * and provides better browser compatibility
 */
export function VideoPlayer({ src, className = '', posterImage = '/video-placeholder.png' }: VideoPlayerProps) {
  if (!src) {
    return (
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
    );
  }

  // Determine video type based on file extension
  const getVideoType = (url: string): string => {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
        return 'video/ogg';
      case 'mov':
      case 'qt':
        // MOV/QuickTime files often contain H.264 video which can be played as MP4
        return 'video/mp4';
      default:
        // Default to MP4 if unknown
        return 'video/mp4';
    }
  };

  return (
    <video 
      controls 
      className={`w-full h-full ${className}`}
      poster={posterImage}
      preload="metadata"
    >
      <source src={src} type={getVideoType(src)} />
      {/* If the original source doesn't work, and it's a .mov file, try using it as MP4 */}
      {src.toLowerCase().endsWith('.mov') && (
        <source src={src} type="video/mp4" />
      )}
      Your browser does not support this video format.
    </video>
  );
} 