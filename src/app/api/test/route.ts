import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection
    const result = await sql`SELECT NOW()`;
    const currentTime = result.rows[0].now;

    // Get database tables
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tables = tablesResult.rows.map(row => row.table_name);

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: currentTime,
      environment: process.env.NODE_ENV,
      tables: tables
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 