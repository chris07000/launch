import { sql } from '@vercel/postgres';
import { Order, Batch, WhitelistEntry, MintedWallet } from './types';

// Re-export types
export type { Order, Batch, WhitelistEntry, MintedWallet };

// Get all orders
export async function getOrders(): Promise<Order[]> {
  const { rows } = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
  return rows.map(row => ({
    id: row.id,
    btcAddress: row.btc_address,
    quantity: row.quantity,
    totalPrice: row.total_price,
    totalPriceUsd: row.total_price_usd,
    pricePerUnit: row.price_per_unit,
    pricePerUnitBtc: row.price_per_unit_btc,
    batchId: row.batch_id,
    paymentAddress: row.payment_address,
    paymentReference: row.payment_reference,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

// Save orders
export async function saveOrders(orders: Order[]): Promise<boolean> {
  try {
    // Clear existing orders and insert new ones
    await sql`TRUNCATE orders`;
    
    for (const order of orders) {
      await sql`
        INSERT INTO orders (
          id, btc_address, quantity, total_price, total_price_usd,
          price_per_unit, price_per_unit_btc, batch_id, payment_address,
          payment_reference, status, created_at, updated_at
        ) VALUES (
          ${order.id}, ${order.btcAddress}, ${order.quantity}, ${order.totalPrice},
          ${order.totalPriceUsd}, ${order.pricePerUnit}, ${order.pricePerUnitBtc},
          ${order.batchId}, ${order.paymentAddress}, ${order.paymentReference},
          ${order.status}, ${order.createdAt}, ${order.updatedAt}
        )
      `;
    }
    return true;
  } catch (error) {
    console.error('Error saving orders:', error);
    return false;
  }
}

// Get all batches
export async function getBatches(): Promise<Batch[]> {
  const { rows } = await sql`SELECT * FROM batches ORDER BY id`;
  return rows.map(row => ({
    id: row.id,
    price: row.price,
    mintedWallets: row.minted_wallets,
    maxWallets: row.max_wallets,
    ordinals: row.ordinals,
    isSoldOut: row.is_sold_out
  }));
}

// Save batches
export async function saveBatches(batches: Batch[]): Promise<boolean> {
  try {
    // Clear existing batches and insert new ones
    await sql`TRUNCATE batches`;
    
    for (const batch of batches) {
      await sql`
        INSERT INTO batches (
          id, price, minted_wallets, max_wallets, ordinals, is_sold_out
        ) VALUES (
          ${batch.id}, ${batch.price}, ${batch.mintedWallets},
          ${batch.maxWallets}, ${batch.ordinals}, ${batch.isSoldOut}
        )
      `;
    }
    return true;
  } catch (error) {
    console.error('Error saving batches:', error);
    return false;
  }
}

// Get whitelist
export async function getWhitelist(): Promise<WhitelistEntry[]> {
  const { rows } = await sql`SELECT * FROM whitelist ORDER BY created_at`;
  return rows.map(row => ({
    address: row.address,
    batchId: row.batch_id,
    createdAt: row.created_at
  }));
}

// Save whitelist
export async function saveWhitelist(entries: WhitelistEntry[]): Promise<boolean> {
  try {
    // Clear existing whitelist and insert new entries
    await sql`TRUNCATE whitelist`;
    
    for (const entry of entries) {
      await sql`
        INSERT INTO whitelist (address, batch_id, created_at)
        VALUES (${entry.address}, ${entry.batchId}, ${entry.createdAt})
      `;
    }
    return true;
  } catch (error) {
    console.error('Error saving whitelist:', error);
    return false;
  }
}

// Get minted wallets
export async function getMintedWallets(): Promise<MintedWallet[]> {
  const { rows } = await sql`SELECT * FROM minted_wallets ORDER BY timestamp`;
  return rows.map(row => ({
    address: row.address,
    batchId: row.batch_id,
    quantity: row.quantity,
    timestamp: row.timestamp
  }));
}

// Save minted wallet
export async function saveMintedWallet(wallet: MintedWallet): Promise<boolean> {
  try {
    await sql`
      INSERT INTO minted_wallets (address, batch_id, quantity, timestamp)
      VALUES (${wallet.address}, ${wallet.batchId}, ${wallet.quantity}, ${wallet.timestamp})
      ON CONFLICT (address, batch_id) 
      DO UPDATE SET quantity = minted_wallets.quantity + EXCLUDED.quantity
    `;
    return true;
  } catch (error) {
    console.error('Error saving minted wallet:', error);
    return false;
  }
}

// Initialize database
export async function initializeStorage(): Promise<void> {
  try {
    await sql`TRUNCATE orders`;
    await sql`TRUNCATE batches`;
    await sql`TRUNCATE whitelist`;
    await sql`TRUNCATE minted_wallets`;
    console.log('Storage initialized successfully');
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
} 