'use server';

import fs from 'fs';
import path from 'path';
import os from 'os';

// Get the OS temporary directory
const tmpDir = os.tmpdir();

// Constants for file paths
const ORDERS_FILE = path.join(tmpDir, 'orders.json');

export async function updateOrderStatus(orderId, status) {
  try {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || '[]');
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
      return { success: true };
    }
    return { success: false, error: 'Order not found' };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
}

export async function debugOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      return { success: false, error: 'Orders file not found' };
    }
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || '[]');
    return { success: true, orders };
  } catch (error) {
    console.error('Error reading orders:', error);
    return { success: false, error: error.message };
  }
} 