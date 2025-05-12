import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as storage from '@/lib/storage-wrapper';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Define a more flexible type for steps
type Step = {
  step: string;
  status: 'success' | 'error';
  error?: any;
  [key: string]: any; // Allow additional properties
};

export async function GET(request: NextRequest) {
  const steps: Step[] = [];
  const isVercel = process.env.VERCEL === '1';
  
  try {
    // Step 1: Test database connection
    try {
      await sql`SELECT NOW()`;
      steps.push({ step: 'Database connection', status: 'success' });
    } catch (error: any) {
      steps.push({ 
        step: 'Database connection', 
        status: 'error',
        error: error.message 
      });
      if (isVercel) {
        throw error; // In Vercel, this is critical
      } else {
        console.warn('Database connection failed, but continuing in local mode');
      }
    }

    // Step 2: Initialize storage (creates tables in Vercel or files in local)
    try {
      await storage.initializeStorage();
      steps.push({ step: 'Initialize storage', status: 'success' });
    } catch (error: any) {
      steps.push({ 
        step: 'Initialize storage', 
        status: 'error',
        error: error.message 
      });
      throw error;
    }
    
    // Step 3: Get all batches
    try {
      const batches = await storage.getBatches();
      steps.push({ 
        step: 'Get batches', 
        status: 'success',
        count: batches.length
      });
    } catch (error: any) {
      steps.push({ 
        step: 'Get batches', 
        status: 'error',
        error: error.message 
      });
    }
    
    // Step 4: Get current batch info
    try {
      const currentBatchInfo = await storage.getCurrentBatch();
      steps.push({ 
        step: 'Get current batch', 
        status: 'success',
        currentBatch: currentBatchInfo.currentBatch
      });
    } catch (error: any) {
      steps.push({ 
        step: 'Get current batch', 
        status: 'error',
        error: error.message 
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      steps,
      environment: isVercel ? 'vercel' : 'local',
      database: process.env.POSTGRES_DATABASE
    });
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      steps,
      environment: isVercel ? 'vercel' : 'local',
      database: process.env.POSTGRES_DATABASE
    }, { status: 500 });
  }
} 