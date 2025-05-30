import { NextApiRequest, NextApiResponse } from 'next';
import { getExerciseBySlug } from '@/lib/api/exercise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { slug } = req.query;
    const { preview } = req.query;

    if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ success: false, error: 'Slug is required' });
    }

    try {
        const exercise = await getExerciseBySlug(slug);

        if (!exercise) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }

        // If preview mode, return only essential fields for tooltip
        if (preview === 'true') {
            const previewExercise = {
                _id: exercise._id,
                name: exercise.name,
                description: exercise.description,
                difficulty: exercise.difficulty,
                tags: exercise.tags,
                urlSlug: exercise.urlSlug
            };

            return res.status(200).json({ success: true, exercise: previewExercise });
        }

        // Return full exercise details
        return res.status(200).json({ success: true, exercise });

    } catch (error) {
        console.error('Error fetching exercise by slug:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch exercise'
        });
    }
} 