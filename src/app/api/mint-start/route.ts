import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In production (Vercel) use /tmp, otherwise use data directory
const BASE_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const MINT_START_FILE = path.join(BASE_DIR, 'mint-start.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bitcointigers2024';

// GET endpoint om de start tijd op te halen
export async function GET() {
  try {
    if (!fs.existsSync(MINT_START_FILE)) {
      return NextResponse.json({ startTime: null });
    }

    const data = fs.readFileSync(MINT_START_FILE, 'utf8');
    const { startTime } = JSON.parse(data);
    return NextResponse.json({ startTime });
  } catch (error) {
    console.error('Error reading mint start time:', error);
    return NextResponse.json({ startTime: null });
  }
}

// POST endpoint om de start tijd in te stellen
export async function POST(req: Request) {
  try {
    const { startTime, password } = await req.json();

    // Validate admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(BASE_DIR)) {
      fs.mkdirSync(BASE_DIR, { recursive: true });
    }

    // Save the start time
    fs.writeFileSync(MINT_START_FILE, JSON.stringify({ startTime }));
    console.log('Successfully wrote to', MINT_START_FILE); // Debug log

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting mint start time:', error);
    return NextResponse.json({ error: 'Failed to set mint start time' }, { status: 500 });
  }
} 