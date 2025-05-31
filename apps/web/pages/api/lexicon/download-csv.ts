import type { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/mongodb';

// Helper function to remove markdown formatting
function removeMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove line breaks and normalize spaces
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to escape CSV fields
function escapeCsvField(field: any): string {
  // Convert to string and handle null/undefined
  const fieldStr = field == null ? '' : String(field);
  
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (fieldStr.includes(',') || fieldStr.includes('\n') || fieldStr.includes('"')) {
    return `"${fieldStr.replace(/"/g, '""')}"`;
  }
  
  return fieldStr;
}

// Helper function to convert lexicon item to CSV row
function lexiconToCsvRow(item: any): string {
  const fields = [
    item.title || '',
    removeMarkdown(item.description || ''),
    item.categories?.join('; ') || '',
    item.submittedBy || '',
    new Date(item.createdAt?.$date?.$numberLong ? parseInt(item.createdAt.$date.$numberLong) : item.createdAt || Date.now()).toISOString().split('T')[0],
    new Date(item.updatedAt?.$date?.$numberLong ? parseInt(item.updatedAt.$date.$numberLong) : item.updatedAt || Date.now()).toISOString().split('T')[0]
  ];

  return fields.map(escapeCsvField).join(',');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      query = '',
      type = 'filtered' // 'filtered' or 'all'
    } = req.query;

    const db = await getDatabase();
    const collection = db.collection('lexicon');

    let items = [];

    if (type === 'all') {
      // Download all lexicon items
      items = await collection
        .find({})
        .sort({ title: 1 })
        .toArray();
    } else {
      // Download filtered lexicon items
      if (query) {
        // Search lexicon items
        items = await collection
          .find({
            $or: [
              { title: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } }
            ]
          })
          .sort({ title: 1 })
          .toArray();
      } else {
        // No filters - get all items
        items = await collection
          .find({})
          .sort({ title: 1 })
          .toArray();
      }
    }

    // Create CSV content
    const csvHeader = [
      'Title',
      'Description',
      'Categories',
      'Submitted By',
      'Created Date',
      'Updated Date'
    ].join(',');

    const csvRows = items.map(lexiconToCsvRow);
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Set headers for file download
    const filename = type === 'all' 
      ? `f3-lexicon-all-${new Date().toISOString().split('T')[0]}.csv`
      : `f3-lexicon-filtered-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('Lexicon CSV Download Error:', error);
    return res.status(500).json({
      error: 'An error occurred while generating CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}