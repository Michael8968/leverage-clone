import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url, method = 'GET', headers, body } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const options: RequestInit = {
      method,
      headers: new Headers(headers || {}),
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      options.body = JSON.stringify(body);
    }

    const apiResponse = await fetch(url, options);

    const responseData = await apiResponse.json();
    
    if (!apiResponse.ok) {
        return NextResponse.json({ error: 'API request failed', status: apiResponse.status, details: responseData }, { status: apiResponse.status });
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Proxy route error:', error);
    return NextResponse.json({ error: 'An internal error occurred', details: error.message }, { status: 500 });
  }
}
