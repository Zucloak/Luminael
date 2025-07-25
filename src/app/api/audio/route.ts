import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return new NextResponse('Failed to fetch audio', { status: response.status });
    }

    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    const fileExtension = url.split('.').pop()?.toLowerCase();
    if (fileExtension === 'mp3') {
      headers.set('Content-Type', 'audio/mpeg');
    } else if (fileExtension === 'wav') {
      headers.set('Content-Type', 'audio/wav');
    } else if (fileExtension === 'ogg') {
        headers.set('Content-Type', 'audio/ogg');
    }


    const readableStream = new ReadableStream({
      start(controller) {
        const reader = response.body!.getReader();
        function pump() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            pump();
          });
        }
        pump();
      },
    });

    return new NextResponse(readableStream, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('Error fetching audio:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
