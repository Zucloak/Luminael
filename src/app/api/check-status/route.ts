import { NextResponse } from 'next/server';

// This is the standard handler function name for Next.js App Router API routes.
export async function GET() {
  const targetUrl = 'https://9000-firebase-studio-1751029512083.cluster-fkltigo73ncaixtmokrzxhwsfc.cloudworkstations.dev';
  const timeout = 5000; // 5 seconds

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) { // Status is in the 200-299 range
      return NextResponse.json(
        { status: 'online', message: 'Workstation is reachable.' },
        { status: 200 }
      );
    } else { // Status is 4xx or 5xx
      return NextResponse.json(
        { status: 'offline', message: 'Workstation responded with an error status.' },
        { status: 200 }
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);
    // This catches network errors, timeouts, etc.
    return NextResponse.json(
      { status: 'offline', message: 'Workstation is unreachable or network error.' },
      { status: 200 }
    );
  }
}
