import { auth } from "@/lib/auth";
import type { NextApiRequest, NextApiResponse } from 'next';

// Convert Next.js request to Web Request
const toWebRequest = (req: NextApiRequest): Request => {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost:3000';
  const url = `${protocol}://${host}${req.url}`;
  
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      headers.set(key, Array.isArray(value) ? value[0] : value);
    }
  });
  
  let body: BodyInit | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = JSON.stringify(req.body);
  }
  
  return new Request(url, {
    method: req.method,
    headers,
    body,
  });
};

// Convert Web Response to Next.js response
const fromWebResponse = async (webResponse: Response, res: NextApiResponse) => {
  res.status(webResponse.status);
  
  // Set headers
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  // Handle different response types
  const contentType = webResponse.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    const data = await webResponse.json();
    res.json(data);
  } else if (contentType.includes('text/')) {
    const text = await webResponse.text();
    res.send(text);
  } else {
    const buffer = await webResponse.arrayBuffer();
    res.send(Buffer.from(buffer));
  }
};

// For pages router, we need to export default handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Convert Next.js request to Web Request
    const webRequest = toWebRequest(req);
    
    // Handle the request using Better Auth's handler
    const webResponse = await auth.handler(webRequest);
    
    // Convert Web Response back to Next.js response
    await fromWebResponse(webResponse, res);
  } catch (error) {
    console.error('Auth handler error:', error);
    
    // Provide more specific error information
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      console.error('URL construction failed. Request details:', {
        url: req.url,
        host: req.headers.host,
        method: req.method,
        protocol: req.headers['x-forwarded-proto'] || 'http'
      });
    }
    
    res.status(500).json({ error: 'Authentication service error' });
  }
} 