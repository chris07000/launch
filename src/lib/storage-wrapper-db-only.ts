/**
 * Storage Wrapper - DATABASE ONLY VERSION
 * For Vercel compatibility - no filesystem dependencies
 */
import { sql } from '@vercel/postgres';
import { 
  Order, 
  Batch, 
  WhitelistEntry, 
  MintedWallet 
} from './types';

// Re-export types
export type { Order, Batch, WhitelistEntry, MintedWallet };

// Get all orders
export async function getOrders(): Promise<Order[]> {
  try {
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
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
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
    console.error('Error saving orders to database:', error);
    return false;
  }
}

// Get all batches
export async function getBatches(): Promise<Batch[]> {
  try {
    const { rows } = await sql`SELECT * FROM batches ORDER BY id`;
    return rows.map(row => ({
      id: row.id,
      price: row.price,
      mintedWallets: row.minted_wallets,
      maxWallets: row.max_wallets,
      ordinals: row.ordinals,
      isSoldOut: row.is_sold_out,
      isFCFS: row.is_fcfs || false
    }));
  } catch (error) {
    console.error('Error getting batches:', error);
    return [];
  }
}

// Save batches
export async function saveBatches(batches: Batch[]): Promise<boolean> {
  try {
    // Clear existing batches and insert new ones
    await sql`TRUNCATE batches`;
    
    for (const batch of batches) {
      await sql`
        INSERT INTO batches (
          id, price, minted_wallets, max_wallets, ordinals, is_sold_out, is_fcfs
        ) VALUES (
          ${batch.id}, ${batch.price}, ${batch.mintedWallets},
          ${batch.maxWallets}, ${batch.ordinals}, ${batch.isSoldOut}, ${batch.isFCFS || false}
        )
      `;
    }
    return true;
  } catch (error) {
    console.error('Error saving batches to database:', error);
    return false;
  }
}

// Get whitelist
export async function getWhitelist(): Promise<WhitelistEntry[]> {
  try {
    const { rows } = await sql`SELECT * FROM whitelist ORDER BY created_at`;
    return rows.map(row => ({
      address: row.address,
      batchId: row.batch_id,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Error getting whitelist:', error);
    return [];
  }
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
    console.error('Error saving whitelist to database:', error);
    return false;
  }
}

// Get current batch info
export async function getCurrentBatch(): Promise<{ currentBatch: number, soldOutAt: number | null }> {
  try {
    const { rows } = await sql`SELECT * FROM current_batch LIMIT 1`;
    if (rows.length > 0) {
      return {
        currentBatch: rows[0].current_batch,
        soldOutAt: rows[0].sold_out_at ? new Date(rows[0].sold_out_at).getTime() : null
      };
    }
    // Default values if no record exists
    return { currentBatch: 1, soldOutAt: null };
  } catch (error) {
    console.error('Error getting current batch from database:', error);
    return { currentBatch: 1, soldOutAt: null };
  }
}

// Save current batch info
export async function saveCurrentBatch(data: { currentBatch: number, soldOutAt: number | null }): Promise<boolean> {
  try {
    await sql`TRUNCATE current_batch`;
    await sql`
      INSERT INTO current_batch (current_batch, sold_out_at)
      VALUES (${data.currentBatch}, ${data.soldOutAt ? new Date(data.soldOutAt).toISOString() : null})
    `;
    return true;
  } catch (error) {
    console.error('Error saving current batch to database:', error);
    return false;
  }
}

// Initialize everything
export async function initializeStorage(): Promise<boolean> {
  try {
    // Create tables if they don't exist yet
    await sql`
      CREATE TABLE IF NOT EXISTS current_batch (
        id SERIAL PRIMARY KEY,
        current_batch INTEGER NOT NULL DEFAULT 1,
        sold_out_at TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY,
        price NUMERIC NOT NULL,
        minted_wallets INTEGER DEFAULT 0,
        max_wallets INTEGER NOT NULL,
        ordinals INTEGER NOT NULL,
        is_sold_out BOOLEAN DEFAULT FALSE,
        is_fcfs BOOLEAN DEFAULT FALSE
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        btc_address TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        total_price NUMERIC NOT NULL,
        total_price_usd NUMERIC NOT NULL,
        price_per_unit NUMERIC NOT NULL,
        price_per_unit_btc NUMERIC NOT NULL,
        batch_id INTEGER NOT NULL,
        payment_address TEXT NOT NULL,
        payment_reference TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS whitelist (
        address TEXT PRIMARY KEY,
        batch_id INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS minted_wallets (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        batch_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        timestamp TEXT NOT NULL
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS used_transactions (
        tx_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        timestamp TIMESTAMP NOT NULL
      )
    `;
    
    // Check if current_batch has data
    const { rows } = await sql`SELECT COUNT(*) as count FROM current_batch`;
    if (rows[0].count === 0) {
      // Insert default values
      await sql`INSERT INTO current_batch (current_batch, sold_out_at) VALUES (1, NULL)`;
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing storage in database:', error);
    return false;
  }
}

// Get minted wallets
export async function getMintedWallets(): Promise<MintedWallet[]> {
  try {
    const { rows } = await sql`SELECT * FROM minted_wallets ORDER BY timestamp`;
    return rows.map(row => ({
      address: row.address,
      batchId: row.batch_id,
      quantity: row.quantity,
      timestamp: row.timestamp
    }));
  } catch (error) {
    console.error('Error getting minted wallets from database:', error);
    return [];
  }
}

// Save minted wallets
export async function saveMintedWallets(wallets: MintedWallet[]): Promise<boolean> {
  try {
    // Clear existing minted wallets and insert new ones
    await sql`TRUNCATE minted_wallets`;
    
    for (const wallet of wallets) {
      await sql`
        INSERT INTO minted_wallets (address, batch_id, quantity, timestamp)
        VALUES (${wallet.address}, ${wallet.batchId}, ${wallet.quantity}, ${wallet.timestamp})
      `;
    }
    return true;
  } catch (error) {
    console.error('Error saving minted wallets to database:', error);
    return false;
  }
} 