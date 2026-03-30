import { NextRequest, NextResponse } from 'next/server';

const WP_BASE = process.env.WP_API_URL
  ? `${process.env.WP_API_URL}/cb/v1`
  : 'https://thecenterbookgr.com/wp-json/cb/v1';

const WP_USER = process.env.WP_API_USER || '';
const WP_PASS = process.env.WP_API_PASSWORD || '';

/**
 * Catch-all proxy: forwards /api/cb/{path} to the WordPress REST API
 * with Basic Auth credentials injected server-side.
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const wpPath = '/' + path.join('/');
  const url = new URL(`${WP_BASE}${wpPath}`);

  // Forward query parameters
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Build headers — forward Content-Type, add auth
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')}`,
  };
  const contentType = req.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  // Forward body for non-GET requests
  let body: string | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }

  const wpRes = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  // Stream the WordPress response back
  const resBody = await wpRes.arrayBuffer();
  return new NextResponse(resBody, {
    status: wpRes.status,
    headers: {
      'Content-Type': wpRes.headers.get('Content-Type') || 'application/json',
    },
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
