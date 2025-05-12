/**
 * Storage Wrapper - handles both filesystem and PostgreSQL database operations
 * Automatically switches between file-based storage (local) and database storage (Vercel)
 */

// Dynamic imports for Node.js modules
let fs: any;
let path: any;

// Only import fs/promises and path in non-Vercel environment
if (typeof process !== 'undefined' && process.env.VERCEL !== '1') {
  // We're in a Node.js environment and not on Vercel
  import('fs/promises').then(module => {
    fs = module.default;
  });
  import('path').then(module => {
    path = module.default;
  });
}

import { sql } from '@vercel/postgres';
import { 
  Order, 
  Batch, 
  WhitelistEntry, 
  MintedWallet 
} from './types';

// Re-export types
export type { Order, Batch, WhitelistEntry, MintedWallet };

// Detect environment
const isVercel = process.env.VERCEL === '1';
// For local environment, create dataDir only if not on Vercel
const dataDir = !isVercel && typeof path !== 'undefined' ? path.join(process.cwd(), 'data') : '';

// Helper to ensure data directory exists (local only)
async function ensureDataDir() {
  if (!isVercel && fs) {
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }
}

// Get all orders
export async function getOrders(): Promise<Order[]> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return [];
      }
      const data = await fs.readFile(path.join(dataDir, 'orders.json'), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading orders file:', error);
      return [];
    }
  }
}

// Save orders
export async function saveOrders(orders: Order[]): Promise<boolean> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return false;
      }
      await ensureDataDir();
      await fs.writeFile(
        path.join(dataDir, 'orders.json'),
        JSON.stringify(orders, null, 2)
      );
      return true;
    } catch (error) {
      console.error('Error writing orders file:', error);
      return false;
    }
  }
}

// Get all batches
export async function getBatches(): Promise<Batch[]> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return [];
      }
      const data = await fs.readFile(path.join(dataDir, 'batches.json'), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading batches file:', error);
      return [];
    }
  }
}

// Save batches
export async function saveBatches(batches: Batch[]): Promise<boolean> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return false;
      }
      await ensureDataDir();
      await fs.writeFile(
        path.join(dataDir, 'batches.json'),
        JSON.stringify(batches, null, 2)
      );
      return true;
    } catch (error) {
      console.error('Error writing batches file:', error);
      return false;
    }
  }
}

// Get whitelist
export async function getWhitelist(): Promise<WhitelistEntry[]> {
  if (isVercel) {
    const { rows } = await sql`SELECT * FROM whitelist ORDER BY created_at`;
    return rows.map(row => ({
      address: row.address,
      batchId: row.batch_id,
      createdAt: row.created_at
    }));
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return [];
      }
      const data = await fs.readFile(path.join(dataDir, 'whitelist.json'), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading whitelist file:', error);
      return [];
    }
  }
}

// Save whitelist
export async function saveWhitelist(entries: WhitelistEntry[]): Promise<boolean> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return false;
      }
      await ensureDataDir();
      await fs.writeFile(
        path.join(dataDir, 'whitelist.json'),
        JSON.stringify(entries, null, 2)
      );
      return true;
    } catch (error) {
      console.error('Error writing whitelist file:', error);
      return false;
    }
  }
}

// Get current batch info
export async function getCurrentBatch(): Promise<{ currentBatch: number, soldOutAt: number | null }> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return { currentBatch: 1, soldOutAt: null };
      }
      const data = await fs.readFile(path.join(dataDir, 'current-batch.json'), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading current-batch file:', error);
      return { currentBatch: 1, soldOutAt: null };
    }
  }
}

// Save current batch info
export async function saveCurrentBatch(data: { currentBatch: number, soldOutAt: number | null }): Promise<boolean> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return false;
      }
      await ensureDataDir();
      await fs.writeFile(
        path.join(dataDir, 'current-batch.json'),
        JSON.stringify(data, null, 2)
      );
      return true;
    } catch (error) {
      console.error('Error writing current-batch file:', error);
      return false;
    }
  }
}

// Initialize everything
export async function initializeStorage(): Promise<boolean> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return false;
      }
      await ensureDataDir();
      
      // Create necessary files with default data if they don't exist
      const files = {
        'current-batch.json': { currentBatch: 1, soldOutAt: null },
        'batches.json': [],
        'orders.json': [],
        'whitelist.json': [],
        'minted-wallets.json': [],
        'used-transactions.json': {}
      };
      
      for (const [filename, defaultData] of Object.entries(files)) {
        const filePath = path.join(dataDir, filename);
        try {
          await fs.access(filePath);
          // File exists, do nothing
        } catch {
          // File doesn't exist, create it with default data
          await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing local storage:', error);
      return false;
    }
  }
}

// Get minted wallets
export async function getMintedWallets(): Promise<MintedWallet[]> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return [];
      }
      const data = await fs.readFile(path.join(dataDir, 'minted-wallets.json'), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading minted-wallets file:', error);
      return [];
    }
  }
}

// Save minted wallets
export async function saveMintedWallets(wallets: MintedWallet[]): Promise<boolean> {
  if (isVercel) {
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
  } else {
    try {
      if (!fs) {
        console.error('fs module not available');
        return false;
      }
      await ensureDataDir();
      await fs.writeFile(
        path.join(dataDir, 'minted-wallets.json'),
        JSON.stringify(wallets, null, 2)
      );
      return true;
    } catch (error) {
      console.error('Error writing minted-wallets file:', error);
      return false;
    }
  }
} 