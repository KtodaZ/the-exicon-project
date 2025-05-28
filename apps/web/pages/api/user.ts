import type { NextApiRequest, NextApiResponse } from 'next';
import { searchUser, updateUser } from 'lib/api/user';
import { auth } from '@/lib/auth';
import { getMdxSource } from 'lib/api/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const result = await searchUser(req.query.query as string);
      return res.status(200).json(result);
    } catch (e: any) {
      console.log(e);
      return res.status(500).json({
        error: e.toString()
      });
    }
  } else if (req.method === 'PUT') {
    const { username, bio } = req.body;
    
    // Convert Next.js headers to Web API Headers format
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, Array.isArray(value) ? value[0] : value);
      }
    });
    
    const session = await auth.api.getSession({
      headers
    });
    
    if (!session || session.user.name !== username) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    try {
      const result = await updateUser(username, bio);
      if (result) {
        await res.revalidate(`/${username}`);
      }
      const bioMdx = await getMdxSource(bio); // return bioMdx to optimistically show updated state
      return res.status(200).json(bioMdx);
    } catch (e: any) {
      console.log(e);
      return res.status(500).json({
        error: e.toString()
      });
    }
  } else {
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
