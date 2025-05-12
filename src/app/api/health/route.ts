import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
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

    // Get memory usage
    const memoryUsage = process.memoryUsage();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      files: fileChecks,
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
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 