import { NextRequest, NextResponse } from 'next/server';
import getYouTubeTitle from 'get-youtube-title';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const title: string = await new Promise((resolve, reject) => {
      getYouTubeTitle(url, process.env.YOUTUBE_API_KEY, (err: any, title: string) => {
        if (err) {
          return reject(err);
        }
        resolve(title);
      });
    });
    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error fetching YouTube title:', error);
    return NextResponse.json({ error: 'Failed to fetch YouTube title' }, { status: 500 });
  }
}
