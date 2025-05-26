import type { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/mongodb';

type Data = {
  status: string;
  message: string;
  mongoConnected: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  let mongoConnected = false;
  
  try {
    // Test MongoDB connection
    const db = await getDatabase();
    await db.command({ ping: 1 });
    mongoConnected = true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }

  res.status(200).json({ 
    status: 'success', 
    message: 'The Exicon Project API is running', 
    mongoConnected 
  });
}