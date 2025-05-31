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
  console.log(`[Auth API] Request received: ${req.method} ${req.url}`);
  if (req.method === 'POST' && req.body) {
    console.log('[Auth API] Request body:', JSON.stringify(req.body, null, 2));
  }
  try {
    // Convert Next.js request to Web Request
    const webRequest = toWebRequest(req);
    console.log('[Auth API] Processing request with better-auth handler...');
    // Handle the request using Better Auth's handler
    const webResponse = await auth.handler(webRequest);
    console.log(`[Auth API] Response from better-auth handler: Status ${webResponse.status}`);
    
    // Convert Web Response back to Next.js response
    await fromWebResponse(webResponse, res);
    console.log('[Auth API] Successfully sent response to client.');
  } catch (error) {
    console.error('[Auth API] Error in handler:', error);
    
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