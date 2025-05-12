import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Simple test query
    const result = await sql`SELECT NOW();`;
    
    return NextResponse.json({
      success: true,
      time: result.rows[0].now,
      message: 'Database connection successful!'
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 