import { createAuth } from "@/lib/auth";
import type { NextApiRequest, NextApiResponse } from 'next';

// Create auth instance with async database connection
let authInstance: any = null;

const getAuth = async () => {
  if (!authInstance) {
    authInstance = await createAuth();
  }
  
  return authInstance;
};

// For pages router, we need to export default handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await getAuth();
    
    // Handle the request using Better Auth's handler
    return await auth.handler(req, res);
  } catch (error) {
    console.error('Auth handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 