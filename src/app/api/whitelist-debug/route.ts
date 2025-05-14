import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

// Direct SQL query op whitelist tabel
async function getWhitelistDirect() {
  try {
    const { rows } = await sql`SELECT * FROM whitelist`;
    return rows;
  } catch (error) {
    console.error('Error in direct whitelist query:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address') || 'bc1p56aezm44a9yvnrkx0eduqrgf7rdjl6l7fnv0at3wm9stt36hfvaqjwqda8';
    
    // 1. Directe SQL query om te zien of adres in whitelist staat
    const directQuery = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
    
    // 2. Gebruik storage.getWhitelist() en controleer of adres erin zit
    const whitelist = await storage.getWhitelist();
    const whitelistEntry = whitelist.find(entry => entry.address === address);
    
    // 3. Log alle adressen in de whitelist voor debug
    const allEntries = await getWhitelistDirect();
    
    // 4. Probeer het adres direct toe te voegen met SQL
    let insertResult = null;
    try {
      await sql`
        INSERT INTO whitelist (address, batch_id, created_at)
        VALUES (${address}, 1, ${new Date().toISOString()})
        ON CONFLICT (address) DO UPDATE SET batch_id = 1, created_at = ${new Date().toISOString()}
      `;
      insertResult = "success";
    } catch (error: any) {
      insertResult = `error: ${error.message}`;
    }
    
    // 5. Controleer opnieuw na toevoegen
    const afterInsertQuery = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
    
    return NextResponse.json({
      debug: true,
      address,
      directQueryResult: {
        found: directQuery.rows.length > 0,
        entries: directQuery.rows
      },
      storageWrapperResult: {
        totalEntries: whitelist.length,
        found: !!whitelistEntry,
        entry: whitelistEntry
      },
      allWhitelistEntries: {
        count: allEntries.length,
        entries: allEntries.map(e => ({
          address: e.address.substring(0, 10) + '...',
          batch_id: e.batch_id,
          created_at: e.created_at
        }))
      },
      insertAttempt: insertResult,
      afterInsert: {
        found: afterInsertQuery.rows.length > 0,
        entries: afterInsertQuery.rows
      }
    });
  } catch (error) {
    console.error('Error in whitelist debug:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 