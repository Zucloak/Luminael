import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!response.ok) {
      throw new Error('Failed to fetch YouTube title');
    }
    const data = await response.json();
    return NextResponse.json({ title: data.title });
  } catch (error) {
    console.error('Error fetching YouTube title:', error);
    // Fallback to returning the original URL as the title
    return NextResponse.json({ title: url });
  }
}
