import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseListItem } from "@/lib/models/exercise";
import { Badge } from "./badge";
import { ExercisePlaceholder } from "./exercise-placeholder";
import Image from "next/image";

interface ExerciseTooltipProps {
    slug: string;
    children: React.ReactNode;
    className?: string;
}

export function ExerciseTooltip({ slug, children, className }: ExerciseTooltipProps) {
    const [exercise, setExercise] = useState<ExerciseListItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [isShiftPressed, setIsShiftPressed] = useState(false);

    // Track Shift key state
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Handle mouse leave - only hide if Shift is not pressed
    const handleMouseLeave = () => {
        if (!isShiftPressed) {
            setShowTooltip(false);
        }
    };

    // Fetch exercise data when tooltip is shown
    useEffect(() => {
        if (showTooltip && !exercise && !loading && !error) {
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
    }, [showTooltip, slug, exercise, loading, error]);

    const getDifficultyInfo = (difficulty: number) => {
        if (difficulty <= 0.3) return { text: "Beginner", className: "text-green-600" };
        if (difficulty <= 0.6) return { text: "Intermediate", className: "text-yellow-600" };
        return { text: "Advanced", className: "text-[#AD0C02]" };
    };

    // Check if we should show placeholder
    const shouldShowPlaceholder = !exercise?.image_url ||
        exercise.image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6693d8938e395d22def508d7.png' ||
        exercise.image_url === 'https://storage.googleapis.com/msgsndr/SrfvOYstGSlBjAXxhvwX/media/6698299f33f2d9f5c28dcb76.png';

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => {
                setShowTooltip(true);
            }}
            onMouseLeave={() => {
                handleMouseLeave();
            }}
        >
            <span className="underline hover:text-[#AD0C02] transition-colors cursor-pointer">
                {children}
            </span>

            {showTooltip && (
                <div className="absolute z-[9999] w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl bottom-full left-1/2 transform -translate-x-1/2 mb-2 overflow-hidden"
                     style={{ position: 'absolute' }}>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200 dark:border-t-gray-800"></div>
                    </div>

                    {loading ? (
                        <div className="p-6 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Could not load exercise preview
                            </p>
                        </div>
                    ) : exercise ? (
                        <>
                            {/* Content Section - Title and Difficulty First */}
                            <div className="px-4 pt-4 pb-0 not-prose">
                                {/* Title */}
                                <h3 className="font-barlow text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-2">
                                    {exercise.name}
                                </h3>

                                {/* Difficulty */}
                                <div className="">
                                    <Badge
                                        variant="outline"
                                        className={`${getDifficultyInfo(exercise.difficulty).className} border-current text-xs px-2 py-1 mb-4 font-medium`}
                                    >
                                        {getDifficultyInfo(exercise.difficulty).text}
                                    </Badge>
                                </div>
                            </div>

                            {/* Image/Placeholder Section */}
                            <div className="aspect-video flex items-center justify-center overflow-hidden not-prose mx-4">
                                {shouldShowPlaceholder ? (
                                    <ExercisePlaceholder title={exercise.name} tags={exercise.tags} />
                                ) : exercise.image_url ? (
                                    <Image
                                        src={exercise.image_url}
                                        alt={exercise.name}
                                        className="object-cover w-full h-full not-prose"
                                        width={320}
                                        height={180}
                                    />
                                ) : null}
                            </div>

                            {/* Bottom Content */}
                            <div className="px-4 pb-4">
                                {/* Description */}
                                {exercise.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                                        {exercise.description}
                                    </p>
                                )}

                                {/* Tags */}
                                {exercise.tags && exercise.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {exercise.tags.slice(0, 4).map(tag => (
                                            <Badge
                                                key={tag}
                                                variant="secondary"
                                                className="text-xs px-2 py-0.5 font-medium"
                                            >
                                                {tag.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </Badge>
                                        ))}
                                        {exercise.tags.length > 4 && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs px-2 py-0.5 text-gray-500 dark:text-gray-400 font-medium"
                                            >
                                                +{exercise.tags.length - 4}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
} 