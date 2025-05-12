import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString()
  });
} 