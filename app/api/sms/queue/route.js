/**
 * POST /api/sms/queue
 * 
 * Webhook endpoint — receives SMS request from CRM and queues it for verification.
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queueMessage } from '@/lib/db';
import config from '@/lib/config';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, message, recipient_name, recipient_type, template_id, api_key } = body;

    // Validate API key
    if (api_key && api_key !== config.api.key) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!phone || !message) {
      return NextResponse.json(
        { error: 'phone and message are required' },
        { status: 400 }
      );
    }

    // Validate phone format (Bangladesh numbers)
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const id = uuidv4();

    queueMessage({
      id,
      phone: cleanPhone,
      message,
      recipientName: recipient_name || '',
      recipientType: recipient_type || 'general',
      templateId: template_id || null,
    });

    return NextResponse.json({
      success: true,
      id,
      message: 'SMS queued for verification',
    });
  } catch (err) {
    console.error('Queue SMS error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
