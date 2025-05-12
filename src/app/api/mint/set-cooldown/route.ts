import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const COOLDOWN_FILE_PATH = path.join(process.cwd(), 'data', 'batch-cooldown.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'default_password';

interface CooldownSettings {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
}

interface BatchCooldownSettings {
  [batchId: string]: CooldownSettings;
  default: CooldownSettings;
}

export async function POST(request: Request) {
  try {
    const { value, unit, password, batchId } = await request.json();

    // Validate password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Validate cooldown time
    if (!value || value < 1) {
      return NextResponse.json({ error: 'Invalid cooldown value. Must be at least 1.' }, { status: 400 });
    }

    // Validate and convert to minutes
    let cooldownMinutes: number;
    switch (unit) {
      case 'minutes':
        if (value > 60) return NextResponse.json({ error: 'Maximum 60 minutes allowed' }, { status: 400 });
        cooldownMinutes = value;
        break;
      case 'hours':
        if (value > 24) return NextResponse.json({ error: 'Maximum 24 hours allowed' }, { status: 400 });
        cooldownMinutes = value * 60;
        break;
      case 'days':
        if (value > 7) return NextResponse.json({ error: 'Maximum 7 days allowed' }, { status: 400 });
        cooldownMinutes = value * 24 * 60;
        break;
      default:
        return NextResponse.json({ error: 'Invalid time unit' }, { status: 400 });
    }

    // Load existing settings or create default
    let settings: BatchCooldownSettings;
    try {
      const data = await fs.readFile(COOLDOWN_FILE_PATH, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      settings = {
        default: { value: 15, unit: 'minutes' }
      };
    }

    // Update settings for specific batch or default
    if (batchId) {
      settings[batchId] = { value, unit };
    } else {
      settings.default = { value, unit };
    }

    // Save cooldown settings
    await fs.writeFile(COOLDOWN_FILE_PATH, JSON.stringify(settings));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting batch cooldown:', error);
    return NextResponse.json({ error: 'Failed to set batch cooldown' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Get batchId from query parameters if provided
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    const data = await fs.readFile(COOLDOWN_FILE_PATH, 'utf-8');
    const settings: BatchCooldownSettings = JSON.parse(data);

    if (batchId && settings[batchId]) {
      return NextResponse.json(settings[batchId]);
    }

    // Return all settings or default if no specific batch requested
    return NextResponse.json(settings);
  } catch (error) {
    // If file doesn't exist or other error, return default values
    return NextResponse.json({
      default: { value: 15, unit: 'minutes' }
    });
  }
}

export async function DELETE(request: Request) {
  try {
    // Get batchId and password from query parameters
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const password = searchParams.get('password');

    // Validate password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Load existing settings
    let settings: BatchCooldownSettings;
    try {
      const data = await fs.readFile(COOLDOWN_FILE_PATH, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      settings = {
        default: { value: 15, unit: 'minutes' }
      };
    }

    // If batchId is provided, delete that specific setting
    if (batchId && batchId !== 'default') {
      delete settings[batchId];
    } else {
      // Reset to default settings
      settings = {
        default: { value: 15, unit: 'minutes' }
      };
    }

    // Save updated settings
    await fs.writeFile(COOLDOWN_FILE_PATH, JSON.stringify(settings));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting batch cooldown:', error);
    return NextResponse.json({ error: 'Failed to delete batch cooldown' }, { status: 500 });
  }
}