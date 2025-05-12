import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as storage from '@/lib/storage-wrapper';

export const dynamic = 'force-dynamic';

type Step = {
  step: string;
  status: 'success' | 'error';
  error?: any;
  [key: string]: any;
};

export async function GET(request: NextRequest) {
  const isVercel = process.env.VERCEL === '1';
  const steps: Step[] = [];

  try {
    // Step 1: Test database connection
    try {
      const result = await sql`SELECT NOW()`;
      steps.push({
        step: 'database_connection',
        status: 'success',
        timestamp: result.rows[0].now
      });
    } catch (error: any) {
      steps.push({
        step: 'database_connection',
        status: 'error',
        error: error.message
      });
      if (isVercel) {
        throw error; // In Vercel, this is critical
      }
    }

    // Step 2: Initialize storage
    try {
      await storage.initializeStorage();
      steps.push({
        step: 'initialize_storage',
        status: 'success'
      });

      // Step 3: Check batches
      const batches = await storage.getBatches();
      if (batches.length === 0) {
        // Initialize default batches
        const defaultBatches = [
          { id: 1, price: 250.00, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 2, price: 260.71, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 3, price: 271.43, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 4, price: 282.14, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 5, price: 292.86, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 6, price: 303.57, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 7, price: 314.29, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 8, price: 325.00, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 9, price: 335.71, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 10, price: 346.43, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 11, price: 357.14, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 12, price: 367.86, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 13, price: 378.57, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 14, price: 389.29, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 15, price: 400.00, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
          { id: 16, price: 450.00, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false }
        ];
        await storage.saveBatches(defaultBatches);
        steps.push({
          step: 'initialize_batches',
          status: 'success',
          count: defaultBatches.length
        });
      } else {
        steps.push({
          step: 'check_batches',
          status: 'success',
          count: batches.length
        });
      }
    } catch (error: any) {
      steps.push({
        step: 'initialize_storage',
        status: 'error',
        error: error.message
      });
      throw error;
    }

    // Step 4: Get database info
    try {
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      const tables = tablesResult.rows.map(row => row.table_name);
      steps.push({
        step: 'database_info',
        status: 'success',
        tables
      });
    } catch (error: any) {
      steps.push({
        step: 'database_info',
        status: 'error',
        error: error.message
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Application initialized successfully',
      steps,
      environment: isVercel ? 'vercel' : 'local',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error initializing application:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to initialize application',
      error: error.message,
      steps,
      environment: isVercel ? 'vercel' : 'local',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 