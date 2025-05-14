import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const password = searchParams.get('password');

    // Password protection
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Direct SQL query voor de batches tabel
    const { rows: batchesRaw } = await sql`SELECT * FROM batches ORDER BY id`;
    
    // Direct SQL query voor de minted_wallets tabel
    const { rows: mintedWalletsRaw } = await sql`SELECT * FROM minted_wallets ORDER BY batch_id, address`;
    
    // Haal ook batches en wallets op via storage API
    const batches = await storage.getBatches();
    const mintedWallets = await storage.getMintedWallets();
    
    // Tel mints per batch
    const mintCounts = {};
    mintedWallets.forEach(wallet => {
      if (!mintCounts[wallet.batchId]) {
        mintCounts[wallet.batchId] = 0;
      }
      mintCounts[wallet.batchId] += wallet.quantity;
    });
    
    // Voeg het totaal aantal mints toe
    let totalMints = 0;
    Object.values(mintCounts).forEach(count => {
      totalMints += count as number;
    });
    
    return NextResponse.json({
      success: true,
      batchesRaw, // Directe database resultaten
      mintedWalletsRaw, // Directe database resultaten
      batches, // Verwerkte batches van de storage API
      mintedWallets, // Verwerkte wallets van de storage API
      mintCounts, // Aantal mints per batch
      totalMints, // Totaal aantal mints
      currentDate: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to get debug info',
      details: error.message
    }, { status: 500 });
  }
} 