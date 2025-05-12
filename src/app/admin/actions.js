'use server';

import fs from 'fs';
import path from 'path';

export async function updateOrderStatus(orderId, status) {
  try {
    const ordersFile = path.join(process.cwd(), 'data/orders.json');
    let orders = {};
    
    if (fs.existsSync(ordersFile)) {
      const ordersData = fs.readFileSync(ordersFile, 'utf8');
      orders = JSON.parse(ordersData || '{}');
    }

    if (orders[orderId]) {
      orders[orderId].status = status;
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}

export async function debugOrders() {
  try {
    const ordersFile = path.join(process.cwd(), 'data/orders.json');
    let orders = {};
    
    if (fs.existsSync(ordersFile)) {
      const ordersData = fs.readFileSync(ordersFile, 'utf8');
      orders = JSON.parse(ordersData || '{}');
    }
    
    return {
      success: true,
      count: Object.keys(orders).length,
      orders
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
} 