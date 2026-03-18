/**
 * GET /api/modem/status
 * 
 * Returns modem connection status, signal strength, and network type.
 */

import { NextResponse } from 'next/server';
import { getModemStatus } from '@/lib/modem';

export async function GET() {
  try {
    const status = await getModemStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error('Modem status error:', err);
    return NextResponse.json(
      { connected: false, error: err.message },
      { status: 500 }
    );
  }
}
