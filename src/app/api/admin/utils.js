import fs from 'fs';
import path from 'path';

export async function syncOrdersToBatches(password) {
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    throw new Error('Invalid password');
  }

  try {
    const ordersFile = path.join(process.cwd(), 'data/orders.json');
    const batchesFile = path.join(process.cwd(), 'data/batches.json');
    const mintedWalletsFile = path.join(process.cwd(), 'data/minted-wallets.json');

    let orders = {};
    let batches = [];
    let mintedWallets = [];

    if (fs.existsSync(ordersFile)) {
      const ordersData = fs.readFileSync(ordersFile, 'utf8');
      orders = JSON.parse(ordersData || '{}');
    }

    if (fs.existsSync(batchesFile)) {
      const batchesData = fs.readFileSync(batchesFile, 'utf8');
      batches = JSON.parse(batchesData || '[]');
    }

    if (fs.existsSync(mintedWalletsFile)) {
      const mintedWalletsData = fs.readFileSync(mintedWalletsFile, 'utf8');
      mintedWallets = JSON.parse(mintedWalletsData || '[]');
    }

    // Update batches based on orders
    for (const orderId in orders) {
      const order = orders[orderId];
      if (order.status === 'paid' && !mintedWallets.includes(order.btcAddress)) {
        const batch = batches.find(b => b.id === order.batchId);
        if (batch) {
          batch.mintedWallets += 1;
          if (batch.mintedWallets >= batch.maxWallets) {
            batch.isSoldOut = true;
          }
          mintedWallets.push(order.btcAddress);
        }
      }
    }

    // Save updated data
    fs.writeFileSync(batchesFile, JSON.stringify(batches, null, 2));
    fs.writeFileSync(mintedWalletsFile, JSON.stringify(mintedWallets, null, 2));

    return true;
  } catch (error) {
    console.error('Error syncing orders to batches:', error);
    return false;
  }
} 