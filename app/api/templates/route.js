/**
 * GET /api/templates
 * 
 * List all available SMS templates.
 */

import { NextResponse } from 'next/server';
import { getTemplates } from '@/lib/db';

export async function GET() {
  try {
    const templates = getTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    console.error('Get templates error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
