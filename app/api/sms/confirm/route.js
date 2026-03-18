/**
 * POST /api/sms/confirm
 * 
 * CRO confirms a pending message — triggers actual SMS send via modem.
 */

import { NextResponse } from 'next/server';
import { getMessageById, updateMessageStatus } from '@/lib/db';
import { sendSMS } from '@/lib/modem';

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

    // Mark as confirmed
    updateMessageStatus(id, 'confirmed');

    // Send SMS via modem
    const result = await sendSMS(msg.phone, msg.message);

    if (result.success) {
      updateMessageStatus(id, 'sent');
      return NextResponse.json({
        success: true,
        message: 'SMS sent successfully',
        simulated: result.simulated || false,
      });
    } else {
      updateMessageStatus(id, 'failed', { error: result.error });
      return NextResponse.json({
        success: false,
        error: result.error,
      });
    }
  } catch (err) {
    console.error('Confirm SMS error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
