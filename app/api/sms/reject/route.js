/**
 * POST /api/sms/reject
 * 
 * CRO rejects a pending message — marks it as rejected without sending.
 */

import { NextResponse } from 'next/server';
import { getMessageById, updateMessageStatus } from '@/lib/db';

export async function POST(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const msg = getMessageById(id);

    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (msg.status !== 'pending') {
      return NextResponse.json(
        { error: `Message is already ${msg.status}` },
        { status: 409 }
      );
    }

    updateMessageStatus(id, 'rejected');

    return NextResponse.json({
      success: true,
      message: 'Message rejected',
    });
  } catch (err) {
    console.error('Reject SMS error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
