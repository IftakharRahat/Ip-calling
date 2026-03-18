/**
 * GET /api/messages
 * 
 * List messages, optionally filtered by status.
 * Query params: ?status=pending|sent|failed|rejected  &limit=50
 */

import { NextResponse } from 'next/server';
import { getMessages } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const messages = getMessages(status, limit);

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
