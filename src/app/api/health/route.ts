import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isVercel = process.env.VERCEL === '1';
  const checks = [];

  try {
    // Check database connection
    try {
      const result = await sql`SELECT NOW()`;
      checks.push({ check: 'database_connection', status: 'healthy' });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      checks.push({ check: 'database_connection', status: 'unhealthy', error: dbError instanceof Error ? dbError.message : 'Unknown error' });
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: isVercel ? 'vercel' : 'local',
      checks,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        environment: isVercel ? 'vercel' : 'local',
        checks
      },
      { status: 500 }
    );
  }
} 