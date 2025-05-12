import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    // Test database connection
    const { rows } = await sql`SELECT NOW()`;
    const currentTime = rows[0].now;

    // Test database tables
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    const tables = tablesResult.rows.map(row => row.table_name);

    return NextResponse.json({
      status: 'connected',
      timestamp: currentTime,
      database: process.env.POSTGRES_DATABASE,
      tables: tables,
      environment: process.env.VERCEL_ENV || 'development'
    });
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message,
      error: error.toString(),
      environment: process.env.VERCEL_ENV || 'development'
    }, { status: 500 });
  }
} 