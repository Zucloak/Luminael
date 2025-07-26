import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('URL parameter is required', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return new NextResponse('Failed to fetch audio', { status: response.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'audio/mpeg');
    headers.set('Content-Length', response.headers.get('Content-Length') || '');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('Error fetching audio:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
