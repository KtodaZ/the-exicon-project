import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { MongoClient } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Convert Next.js headers to Web API Headers format for Better Auth
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, Array.isArray(value) ? value[0] : value);
      }
    });

    // Get current session
    const session = await auth.api.getSession({
      headers
    });

    if (!session) {
      return res.status(401).json({ error: 'No session found' });
    }

    // Connect to MongoDB to check membership directly
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    // Get user's memberships
    const memberships = await db.collection('member').find({ 
      userId: session.user.id 
    }).toArray();

    // Get organizations
    const organizations = await db.collection('organization').find({}).toArray();

    // Try Better Auth API calls
    let activeMember = null;
    let orgList = null;
    let fullOrg = null;

    try {
      const activeMemberResult = await auth.api.getActiveMember({ headers });
      activeMember = activeMemberResult;
    } catch (error) {
      activeMember = { error: (error as Error).message };
    }

    try {
      const orgListResult = await auth.api.listOrganizations({ headers });
      orgList = orgListResult;
    } catch (error) {
      orgList = { error: (error as Error).message };
    }

    try {
      const fullOrgResult = await auth.api.getFullOrganization({ headers });
      fullOrg = fullOrgResult;
    } catch (error) {
      fullOrg = { error: (error as Error).message };
    }

    await client.close();

    res.status(200).json({
      session: {
        userId: session.user.id,
        activeOrganizationId: session.session.activeOrganizationId
      },
      database: {
        memberships,
        organizations
      },
      betterAuthAPI: {
        activeMember,
        orgList,
        fullOrg
      }
    });

  } catch (error) {
    console.error('Error in test-org-membership:', error);
    res.status(500).json({ 
      error: 'Failed to test organization membership',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 