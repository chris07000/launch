import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as storage from '@/lib/storage-wrapper';

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

    // Step 2: Initialize storage tables
    try {
      // Create current_batch table
      await sql`
        CREATE TABLE IF NOT EXISTS current_batch (
          id SERIAL PRIMARY KEY,
          current_batch INTEGER NOT NULL DEFAULT 1,
          sold_out_at TIMESTAMP
        )
      `;

      // Create batches table
      await sql`
        CREATE TABLE IF NOT EXISTS batches (
          id INTEGER PRIMARY KEY,
          price NUMERIC NOT NULL,
          minted_wallets INTEGER DEFAULT 0,
          max_wallets INTEGER NOT NULL,
          ordinals INTEGER NOT NULL,
          is_sold_out BOOLEAN DEFAULT FALSE,
          is_fcfs BOOLEAN DEFAULT FALSE
        )
      `;

      // Create orders table
      await sql`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          btc_address TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          total_price NUMERIC NOT NULL,
          total_price_usd NUMERIC NOT NULL,
          price_per_unit NUMERIC NOT NULL,
          price_per_unit_btc NUMERIC NOT NULL,
          batch_id INTEGER NOT NULL,
          payment_address TEXT NOT NULL,
          payment_reference TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `;

      // Create whitelist table
      await sql`
        CREATE TABLE IF NOT EXISTS whitelist (
          address TEXT PRIMARY KEY,
          batch_id INTEGER NOT NULL,
          created_at TEXT NOT NULL
        )
      `;

      // Create minted_wallets table
      await sql`
        CREATE TABLE IF NOT EXISTS minted_wallets (
          id SERIAL PRIMARY KEY,
          address TEXT NOT NULL,
          batch_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          timestamp TEXT NOT NULL
        )
      `;

      // Create used_transactions table
      await sql`
        CREATE TABLE IF NOT EXISTS used_transactions (
          tx_id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          timestamp TIMESTAMP NOT NULL
        )
      `;
      
      steps.push({ step: 'Create tables', status: 'success' });
    } catch (error: any) {
      steps.push({ 
        step: 'Create tables', 
        status: 'error',
        error: error.message 
      });
      throw error;
    }

    // Step 3: Initialize storage
    try {
      await storage.initializeStorage();
      steps.push({ step: 'Initialize storage', status: 'success' });

      // Check and initialize batches if needed
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
        steps.push({ step: 'Initialize default batches', status: 'success', count: defaultBatches.length });
      }

      // Initialize empty wallets list if needed
      try {
        const mintedWallets = await storage.getMintedWallets();
        if (!mintedWallets || mintedWallets.length === 0) {
          await storage.saveMintedWallets([]);
          steps.push({ step: 'Initialize minted wallets', status: 'success' });
        }
      } catch (error: any) {
        steps.push({ step: 'Initialize minted wallets', status: 'error', error: error.message });
      }

      // Initialize empty whitelist if needed
      try {
        const whitelist = await storage.getWhitelist();
        if (!whitelist || whitelist.length === 0) {
          await storage.saveWhitelist([]);
          steps.push({ step: 'Initialize whitelist', status: 'success' });
        }
      } catch (error: any) {
        steps.push({ step: 'Initialize whitelist', status: 'error', error: error.message });
      }
    } catch (error: any) {
      steps.push({ 
        step: 'Initialize storage', 
        status: 'error',
        error: error.message 
      });
      throw error;
    }
    
    // Step 4: Get all batches
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
    
    // Step 5: Get current batch info
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