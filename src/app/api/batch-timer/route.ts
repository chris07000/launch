import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { BatchDuration } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Haal batch duration instellingen op
async function getBatchDurations(): Promise<BatchDuration[]> {
  try {
    // Controleer of de tabel bestaat
    const { rows: tableCheck } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'batch_durations'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      // Tabel bestaat nog niet, maak deze aan
      await sql`
        CREATE TABLE batch_durations (
          batch_id INTEGER PRIMARY KEY,
          start_time BIGINT NULL,
          end_time BIGINT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 60
        )
      `;
      return []; // Tabel was leeg, return lege array
    }
    
    // Haal alle duraties op
    const { rows } = await sql`SELECT * FROM batch_durations ORDER BY batch_id`;
    
    // Map naar BatchDuration interface
    return rows.map(row => ({
      batchId: row.batch_id,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes
    }));
  } catch (error) {
    console.error('Error getting batch durations:', error);
    return [];
  }
}

// Set batch duration
async function setBatchDuration(batchId: number, durationMinutes: number): Promise<boolean> {
  try {
    // Controleer of de tabel bestaat
    const { rows: tableCheck } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'batch_durations'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      // Tabel bestaat nog niet, maak deze aan
      await sql`
        CREATE TABLE batch_durations (
          batch_id INTEGER PRIMARY KEY,
          start_time BIGINT NULL,
          end_time BIGINT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 60
        )
      `;
    }
    
    // Voeg toe of update de batch duration
    await sql`
      INSERT INTO batch_durations (batch_id, duration_minutes, start_time, end_time)
      VALUES (${batchId}, ${durationMinutes}, NULL, NULL)
      ON CONFLICT (batch_id) 
      DO UPDATE SET duration_minutes = ${durationMinutes}
    `;
    
    return true;
  } catch (error) {
    console.error('Error setting batch duration:', error);
    return false;
  }
}

// Start batch timer
async function startBatchTimer(batchId: number): Promise<boolean> {
  try {
    // Controleer of de batch bestaat in de duraties tabel
    const { rows } = await sql`
      SELECT * FROM batch_durations WHERE batch_id = ${batchId}
    `;
    
    const now = Date.now();
    const durationMinutes = rows.length > 0 ? rows[0].duration_minutes : 60; // Default 60 minuten
    const endTime = now + (durationMinutes * 60 * 1000);
    
    if (rows.length === 0) {
      // Batch bestaat nog niet in duraties, voeg toe
      await sql`
        INSERT INTO batch_durations (batch_id, start_time, end_time, duration_minutes)
        VALUES (${batchId}, ${now}, ${endTime}, ${durationMinutes})
      `;
    } else {
      // Update bestaande batch
      await sql`
        UPDATE batch_durations 
        SET start_time = ${now}, end_time = ${endTime}
        WHERE batch_id = ${batchId}
      `;
    }
    
    return true;
  } catch (error) {
    console.error('Error starting batch timer:', error);
    return false;
  }
}

// Stop batch timer
async function stopBatchTimer(batchId: number): Promise<boolean> {
  try {
    await sql`
      UPDATE batch_durations 
      SET end_time = NULL, start_time = NULL
      WHERE batch_id = ${batchId}
    `;
    return true;
  } catch (error) {
    console.error('Error stopping batch timer:', error);
    return false;
  }
}

// GET endpoint voor ophalen van alle batch timers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const password = searchParams.get('password');
    
    // Controleer wachtwoord alleen voor specifieke operaties
    const requiresAuth = searchParams.has('password');
    if (requiresAuth && password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Ongeldig wachtwoord' }, { status: 401 });
    }
    
    // Haal alle batch durations op
    const durations = await getBatchDurations();
    
    // Als batchId is opgegeven, filter op die batch
    if (batchId) {
      const batchIdNum = parseInt(batchId);
      const duration = durations.find(d => d.batchId === batchIdNum);
      
      if (!duration) {
        return NextResponse.json({ error: `Batch ${batchId} niet gevonden` }, { status: 404 });
      }
      
      return NextResponse.json({
        batchId: batchIdNum,
        duration: duration.durationMinutes,
        startTime: duration.startTime,
        endTime: duration.endTime,
        isActive: duration.startTime !== null && duration.endTime !== null,
        timeRemaining: duration.endTime ? duration.endTime - Date.now() : null
      });
    }
    
    // Return alle durations, met extra info over huidige status
    const now = Date.now();
    const durationsWithStatus = durations.map(duration => ({
      batchId: duration.batchId,
      duration: duration.durationMinutes,
      startTime: duration.startTime,
      endTime: duration.endTime,
      isActive: duration.startTime !== null && duration.endTime !== null,
      timeRemaining: duration.endTime ? duration.endTime - now : null
    }));
    
    return NextResponse.json({ durations: durationsWithStatus });
  } catch (error: any) {
    console.error('Error in batch-timer GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST endpoint voor het instellen en starten/stoppen van batch timers
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { batchId, action, durationMinutes, password } = data;
    
    // Controleer wachtwoord
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Ongeldig wachtwoord' }, { status: 401 });
    }
    
    // Controleer of batchId is opgegeven
    if (!batchId || isNaN(parseInt(`${batchId}`))) {
      return NextResponse.json({ error: 'Geldig batchId is vereist' }, { status: 400 });
    }
    
    const batchIdNum = parseInt(`${batchId}`);
    
    // Voer actie uit op basis van opgegeven actie
    switch (action) {
      case 'set':
        // Controleer of durationMinutes is opgegeven
        if (!durationMinutes || isNaN(parseInt(`${durationMinutes}`))) {
          return NextResponse.json({ error: 'Geldige durationMinutes is vereist' }, { status: 400 });
        }
        
        const durationMinutesNum = parseInt(`${durationMinutes}`);
        const success = await setBatchDuration(batchIdNum, durationMinutesNum);
        
        if (!success) {
          return NextResponse.json({ error: 'Fout bij instellen van batch duration' }, { status: 500 });
        }
        
        return NextResponse.json({
          success: true,
          message: `Batch ${batchIdNum} duration ingesteld op ${durationMinutesNum} minuten`
        });
        
      case 'start':
        const startSuccess = await startBatchTimer(batchIdNum);
        
        if (!startSuccess) {
          return NextResponse.json({ error: 'Fout bij starten van batch timer' }, { status: 500 });
        }
        
        return NextResponse.json({
          success: true,
          message: `Timer voor batch ${batchIdNum} is gestart`
        });
        
      case 'stop':
        const stopSuccess = await stopBatchTimer(batchIdNum);
        
        if (!stopSuccess) {
          return NextResponse.json({ error: 'Fout bij stoppen van batch timer' }, { status: 500 });
        }
        
        return NextResponse.json({
          success: true,
          message: `Timer voor batch ${batchIdNum} is gestopt`
        });
        
      default:
        return NextResponse.json({ error: 'Ongeldige actie. Gebruik "set", "start" of "stop"' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in batch-timer POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 