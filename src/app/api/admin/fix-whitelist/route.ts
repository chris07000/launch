import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const password = searchParams.get('password');

    // Password protection
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Read the whitelist.json file
    const whitelist = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'whitelist.json'), 'utf8'));
    
    console.log('Whitelist from JSON file:', whitelist);
    
    // Get current database whitelist
    const { rows: dbWhitelist } = await sql`SELECT * FROM whitelist`;
    
    console.log('Current database whitelist:', dbWhitelist);
    
    // Figure out which entries need to be added to the database
    const addressesInDb = new Set(dbWhitelist.map((entry: any) => entry.address));
    const entriesToAdd = whitelist.filter((entry: any) => !addressesInDb.has(entry.address));
    
    console.log('Entries to add to database:', entriesToAdd);
    
    // Add the missing entries to the database
    for (const entry of entriesToAdd) {
      await sql`
        INSERT INTO whitelist (address, batch_id, created_at)
        VALUES (${entry.address}, ${entry.batchId}, ${entry.createdAt})
        ON CONFLICT (address) 
        DO UPDATE SET 
          batch_id = ${entry.batchId},
          created_at = ${entry.createdAt}
      `;
      console.log(`Added ${entry.address} to database whitelist for batch ${entry.batchId}`);
    }
    
    // Get updated database whitelist
    const { rows: updatedDbWhitelist } = await sql`SELECT * FROM whitelist`;
    
    return NextResponse.json({
      success: true,
      entriesAdded: entriesToAdd.length,
      originalJSONWhitelist: whitelist,
      originalDBWhitelist: dbWhitelist,
      updatedDBWhitelist: updatedDbWhitelist
    });
  } catch (error: any) {
    console.error('Error syncing whitelist:', error);
    return NextResponse.json({ 
      error: 'Failed to sync whitelist',
      details: error.message
    }, { status: 500 });
  }
} 