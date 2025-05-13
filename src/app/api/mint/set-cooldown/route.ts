import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

interface CooldownSetting {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
}

interface CooldownSettings {
  [key: string]: CooldownSetting;
}

// Haal de cooldown instellingen op uit de database
async function getCooldownSettings(): Promise<CooldownSettings> {
  try {
    // Check if table exists - if not, create it
    await sql`
      CREATE TABLE IF NOT EXISTS batch_cooldowns (
        batch_id TEXT PRIMARY KEY,
        cooldown_value INTEGER NOT NULL,
        cooldown_unit TEXT NOT NULL
      )
    `;
    
    // Fetch all cooldown settings
    const { rows } = await sql`SELECT * FROM batch_cooldowns`;
    
    // Convert to the expected format
    const settings: CooldownSettings = {
      default: { value: 15, unit: 'minutes' } // Default fallback
    };
    
    rows.forEach(row => {
      settings[row.batch_id] = {
        value: row.cooldown_value,
        unit: row.cooldown_unit as 'minutes' | 'hours' | 'days'
      };
    });
    
    // Ensure default setting exists
    if (!settings.default) {
      // Insert default if not present
      await sql`
        INSERT INTO batch_cooldowns (batch_id, cooldown_value, cooldown_unit)
        VALUES ('default', 15, 'minutes')
        ON CONFLICT (batch_id) DO NOTHING
      `;
      settings.default = { value: 15, unit: 'minutes' };
    }
    
    return settings;
  } catch (error) {
    console.error('Error fetching cooldown settings:', error);
    // Return default value if there's an error
    return { default: { value: 15, unit: 'minutes' } };
  }
}

// GET handler to retrieve cooldown settings
export async function GET() {
  try {
    const settings = await getCooldownSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in GET cooldown settings:', error);
    return NextResponse.json({ error: 'Failed to retrieve cooldown settings' }, { status: 500 });
  }
}

// POST handler to update a cooldown setting
export async function POST(request: Request) {
  try {
    const { value, unit, batchId, password } = await request.json();
    
    // Validate the request
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    if (!value || !unit) {
      return NextResponse.json({ error: 'Value and unit are required' }, { status: 400 });
    }
    
    // Validate the unit
    if (!['minutes', 'hours', 'days'].includes(unit)) {
      return NextResponse.json({ error: 'Unit must be one of: minutes, hours, days' }, { status: 400 });
    }
    
    // Convert value to number
    const numValue = Number(value);
    
    // Validate the value based on unit
    const maxValues = { minutes: 60, hours: 24, days: 7 };
    if (numValue <= 0 || numValue > maxValues[unit as keyof typeof maxValues]) {
      return NextResponse.json({ 
        error: `Value must be between 1 and ${maxValues[unit as keyof typeof maxValues]} for ${unit}` 
      }, { status: 400 });
    }
    
    // Use 'default' if batchId is null or undefined
    const targetBatchId = batchId || 'default';
    
    // Save to database using UPSERT
    await sql`
      INSERT INTO batch_cooldowns (batch_id, cooldown_value, cooldown_unit)
      VALUES (${targetBatchId}, ${numValue}, ${unit})
      ON CONFLICT (batch_id) 
      DO UPDATE SET 
        cooldown_value = ${numValue},
        cooldown_unit = ${unit}
    `;
    
    const settings = await getCooldownSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error setting batch cooldown:', error);
    return NextResponse.json({ error: `Error setting batch cooldown: ${error}` }, { status: 500 });
  }
}

// DELETE handler to remove a specific cooldown setting
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const password = searchParams.get('password');
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }
    
    if (batchId === 'default') {
      // Don't delete default, just reset to default values
      await sql`
        UPDATE batch_cooldowns
        SET cooldown_value = 15, cooldown_unit = 'minutes'
        WHERE batch_id = 'default'
      `;
    } else {
      // Delete the specific batch cooldown
      await sql`DELETE FROM batch_cooldowns WHERE batch_id = ${batchId}`;
    }
    
    const settings = await getCooldownSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error deleting batch cooldown:', error);
    return NextResponse.json({ error: `Error deleting batch cooldown: ${error}` }, { status: 500 });
  }
}