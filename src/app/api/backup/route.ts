import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    // Verify the secret key to prevent unauthorized access
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key !== process.env.BACKUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Execute the backup script
    const scriptPath = path.join(process.cwd(), 'scripts', 'backup-data.js');
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Backup completed',
      output: stdout,
      error: stderr 
    });
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Backup failed' 
    }, { status: 500 });
  }
} 