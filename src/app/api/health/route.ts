import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { sql } from '@vercel/postgres';

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

    // Only check file access if not on Vercel
    if (!isVercel) {
      try {
        // Check if we can access the data directory
        const dataDir = path.join(process.cwd(), 'data');
        await fs.access(dataDir);

        // Check if critical files exist
        const files = ['batches.json', 'whitelist.json', 'orders.json', 'batch-cooldown.json'];
        const fileChecks = await Promise.all(
          files.map(async (file) => {
            try {
              await fs.access(path.join(dataDir, file));
              return { file, exists: true };
            } catch {
              return { file, exists: false };
            }
          })
        );
        checks.push({ check: 'file_system', status: 'healthy', files: fileChecks });
      } catch (fsError) {
        console.error('File system check error:', fsError);
        checks.push({ check: 'file_system', status: 'unhealthy', error: fsError instanceof Error ? fsError.message : 'Unknown error' });
      }
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