import { NextResponse } from 'next/server';

const getMimeType = (url: string) => {
    const fileExtension = url.split('.').pop()?.toLowerCase();
    switch (fileExtension) {
        case 'mp3':
            return 'audio/mpeg';
        case 'wav':
            return 'audio/wav';
        case 'ogg':
            return 'audio/ogg';
        default:
            return 'application/octet-stream';
    }
};

const handleRequest = async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const response = await fetch(url, { method: request.method });
        if (!response.ok) {
            return new NextResponse(`Failed to fetch audio: ${response.statusText}`, { status: response.status });
        }

        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Range');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Content-Type', getMimeType(url));

        if (request.method === 'HEAD') {
            return new NextResponse(null, { status: 200, headers });
        }

        const readableStream = new ReadableStream({
            start(controller) {
                if (!response.body) {
                    controller.close();
                    return;
                }
                const reader = response.body.getReader();
                function pump() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            controller.close();
                            return;
                        }
                        controller.enqueue(value);
                        pump();
                    }).catch(error => {
                        console.error('Error pumping stream:', error);
                        controller.error(error);
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
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error', message: errorMessage }), { status: 500 });
    }
}

export async function GET(request: Request) {
    return handleRequest(request);
}

export async function HEAD(request: Request) {
    return handleRequest(request);
}
