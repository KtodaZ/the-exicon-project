import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseListItem } from "@/lib/models/exercise";
import { TagBadge } from "@/components/ui/tag-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { VideoPlayer } from './video-player';
import Image from "next/image";
import { ExercisePlaceholder } from './ui/exercise-placeholder';
import { useState, useEffect } from 'react';
import { permissions } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
// @ts-ignore - Known lucide-react barrel optimization issue in Turborepo
import { Edit, Trash2, Eye } from 'lucide-react';

interface ExerciseCardWithActionsProps {
  exercise: ExerciseListItem;
  onTagClick?: (tag: string) => void;
  onEdit?: (exercise: ExerciseListItem) => void;
  onDelete?: (exercise: ExerciseListItem) => void;
  className?: string;
}

export function ExerciseCardWithActions({ 
  exercise, 
  onTagClick, 
  onEdit,
  onDelete,
  className 
}: ExerciseCardWithActionsProps) {
  const { name, description, tags, urlSlug, difficulty, video_url, image_url } = exercise;
  const [userPermissions, setUserPermissions] = useState({
    canEdit: false,
    canDelete: false,
    canView: true, // Everyone can view
  });

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const [canEdit, canDelete, canView] = await Promise.all([
        permissions.canEditExercise(),
        permissions.canDeleteExercise(),
        permissions.canViewExercise(),
      ]);

      setUserPermissions({
        canEdit,
        canDelete,
        canView,
      });
    };

    checkPermissions();
  }, []);
  
  // Check if this is one of the placeholder image URLs
  const isPlaceholderImage = image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6693d8938e395d22def508d7.png' ||
                            image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6698299f33f2d9f5c28dcb76.png';
  
  // Function to determine difficulty level text and color
  const getDifficultyInfo = (difficultyValue: number) => {
    if (difficultyValue <= 0.3) return { text: "Beginner", className: "text-green-600" };
    if (difficultyValue <= 0.6) return { text: "Intermediate", className: "text-yellow-600" };
    return { text: "Advanced", className: "text-brand-red" };
  };
  
  const difficultyInfo = getDifficultyInfo(difficulty);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    
    console.log('Card clicked:', urlSlug);
  };

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    console.log('Tag clicked:', tag);
    e.stopPropagation();
    e.preventDefault();
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEdit) {
      onEdit(exercise);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete && window.confirm(`Are you sure you want to delete "${name}"?`)) {
      onDelete(exercise);
    }
  };

  // Don't show card if user can't view (though this should rarely happen)
  if (!userPermissions.canView) {
    return null;
  }

  return (
    <Card className={cn("h-full transition-all hover:shadow-md relative", className)}>
      {/* Action buttons overlay for admin/maintainer users */}
      {(userPermissions.canEdit || userPermissions.canDelete) && (
        <div className="absolute top-2 right-2 z-10 flex space-x-1">
          {userPermissions.canEdit && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleEdit}
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-md"
              title="Edit exercise"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {userPermissions.canDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-600 shadow-md"
              title="Delete exercise"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      <Link href={`/exicon/${urlSlug}`} onClick={handleCardClick}>
        <div className="cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold line-clamp-2 mb-4">{name}</CardTitle>
            <p className={cn("text-sm font-medium mb-3", difficultyInfo.className)}>
              {difficultyInfo.text}
            </p>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-md mb-5 flex items-center justify-center overflow-hidden">
              {isPlaceholderImage ? (
                <ExercisePlaceholder title={name} tags={tags} />
              ) : image_url ? (
                <div className="relative w-full h-full">
                  <Image 
                    src={image_url} 
                    alt={name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ) : video_url ? (
                <div className="w-full h-full pointer-events-none">
                  <VideoPlayer src={video_url} />
                </div>
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
            <p className="text-gray-600 dark:text-gray-400 line-clamp-3 text-sm">
              {description}
            </p>
          </CardContent>
        </div>
      </Link>
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