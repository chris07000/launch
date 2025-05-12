import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const ordersFile = '/tmp/orders.json';
    
    if (!fs.existsSync(ordersFile)) {
      return NextResponse.json({
        success: false,
        error: 'Orders file does not exist',
        path: ordersFile
      });
    }
    
    const ordersData = fs.readFileSync(ordersFile, 'utf8');
    let orders;
    
    try {
      orders = JSON.parse(ordersData || '{}');
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse orders JSON',
        rawData: ordersData
      });
    }
    
    return NextResponse.json({
      success: true,
      count: Object.keys(orders).length,
      orders: orders
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 