import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeApp } from './lib/init';

let isInitialized = false;

export async function middleware(request: NextRequest) {
  if (!isInitialized) {
    try {
      await initializeApp();
      isInitialized = true;
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
} 