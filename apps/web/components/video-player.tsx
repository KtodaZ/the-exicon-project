import React, { useState } from 'react';
import Image from 'next/image';

interface VideoPlayerProps {
  src: string | null;
  className?: string;
  posterImage?: string;
}

/**
 * VideoPlayer component that handles multiple video formats
 * and provides better browser compatibility with an interactive placeholder
 */
export function VideoPlayer({ src, className = '', posterImage = '/video-placeholder.png' }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

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

  // If video is playing, show the actual video player
  if (isPlaying) {
    return (
      <video 
        controls 
        autoPlay
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

  // Show placeholder with play button overlay
  return (
    <div 
      className={`relative w-full h-full cursor-pointer group ${className}`}
      onClick={() => setIsPlaying(true)}
    >
      {/* Placeholder image */}
      <Image
        src={posterImage}
        alt="Video thumbnail"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      
      {/* Dark overlay on hover */}
      <div className="absolute inset-0 bg-black bg-opacity-25 group-hover:bg-opacity-40 transition-all duration-200" />
      
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white bg-opacity-90 group-hover:bg-opacity-100 rounded-full p-4 shadow-lg transition-all duration-200 group-hover:scale-110">
          <svg 
            className="h-8 w-8 text-gray-800 ml-1" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      
      {/* Optional: Video duration or other metadata could go here */}
    </div>
  );
} 