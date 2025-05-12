import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

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
      const result = await sql`SELECT NOW()`;
      steps.push({ 
        step: 'Database connection', 
        status: 'success',
        timestamp: result.rows[0].now
      });
    } catch (error: any) {
      steps.push({ 
        step: 'Database connection', 
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
      steps.push({ step: 'Initialize storage', status: 'success' });
    } catch (error: any) {
      steps.push({ 
        step: 'Initialize storage', 
        status: 'error',
        error: error.message 
      });
      throw error;
    }
    
    // Step 3: Check batches and initialize if needed
    try {
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
          step: 'Initialize batches', 
          status: 'success', 
          count: defaultBatches.length 
        });
      } else {
        steps.push({ 
          step: 'Check batches', 
          status: 'success',
          count: batches.length
        });
      }
    } catch (error: any) {
      steps.push({ 
        step: 'Check batches', 
        status: 'error',
        error: error.message 
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database initialized successfully',
      steps,
      environment: isVercel ? 'vercel' : 'local',
      database: process.env.POSTGRES_DATABASE
    });
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to initialize database',
      error: error.message,
      steps,
      environment: isVercel ? 'vercel' : 'local'
    }, { status: 500 });
  }
} 