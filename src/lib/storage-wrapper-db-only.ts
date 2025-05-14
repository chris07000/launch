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

/**
 * Retries a database operation up to a specified number of times with exponential backoff
 * @param operation The database operation to retry
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param initialDelay Initial delay in ms before first retry (default: 200)
 * @returns Result of the operation
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 200
): Promise<T> {
  let lastError: any;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a connection error that's retryable
      const isRetryable = error.message?.includes('fetch failed') || 
                          error.message?.includes('Error connecting to database') ||
                          error.message?.includes('connection timeout');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}

// Get all orders
export async function getOrders(): Promise<Order[]> {
  try {
    const { rows } = await withRetry(async () => 
      await sql`SELECT * FROM orders ORDER BY created_at DESC`
    );
    
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
    // Instead of truncating and recreating all orders (which is risky),
    // we'll use UPSERT to update existing orders or insert new ones
    for (const order of orders) {
      await withRetry(async () => 
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
          ON CONFLICT (id) 
          DO UPDATE SET
            btc_address = ${order.btcAddress},
            quantity = ${order.quantity},
            total_price = ${order.totalPrice},
            total_price_usd = ${order.totalPriceUsd},
            price_per_unit = ${order.pricePerUnit},
            price_per_unit_btc = ${order.pricePerUnitBtc},
            batch_id = ${order.batchId},
            payment_address = ${order.paymentAddress},
            payment_reference = ${order.paymentReference},
            status = ${order.status},
            created_at = ${order.createdAt},
            updated_at = ${order.updatedAt}
        `
      );
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
    const { rows } = await withRetry(async () => 
      await sql`SELECT * FROM batches ORDER BY id`
    );
    
    console.log('Raw database batches:', rows);
    
    return rows.map(row => {
      // Zorg ervoor dat de prijs correct wordt geconverteerd naar een nummer
      const price = typeof row.price === 'string' ? parseFloat(row.price) : 
                   typeof row.price === 'number' ? row.price : 0;
      
      console.log(`Batch ${row.id} price: ${row.price}, converted: ${price}, type: ${typeof price}`);
      
      // Bereken mintedTigers op basis van mintedWallets
      const mintedTigers = row.minted_tigers !== undefined ? row.minted_tigers : row.minted_wallets * 2;
      
      return {
        id: row.id,
        price: price,
        mintedWallets: row.minted_wallets,
        mintedTigers: mintedTigers,
        maxWallets: row.max_wallets,
        ordinals: row.ordinals,
        isSoldOut: row.is_sold_out,
        isFCFS: row.is_fcfs || false
      };
    });
  } catch (error) {
    console.error('Error getting batches:', error);
    return [];
  }
}

// Save batches
export async function saveBatches(batches: Batch[]): Promise<boolean> {
  try {
    // Maak zeker dat de batches tabel de minted_tigers kolom heeft
    await withRetry(async () =>
      await sql`
        ALTER TABLE batches ADD COLUMN IF NOT EXISTS minted_tigers INTEGER DEFAULT 0
      `
    );
    
    // Gebruik UPSERT in plaats van TRUNCATE
    for (const batch of batches) {
      // Zorg dat mintedTigers altijd aanwezig is, standaard wallets * 2
      const mintedTigers = batch.mintedTigers !== undefined ? batch.mintedTigers : batch.mintedWallets * 2;
      
      await withRetry(async () => 
        await sql`
          INSERT INTO batches (
            id, price, minted_wallets, minted_tigers, max_wallets, ordinals, is_sold_out, is_fcfs
          ) VALUES (
            ${batch.id}, ${batch.price}, ${batch.mintedWallets}, ${mintedTigers},
            ${batch.maxWallets}, ${batch.ordinals}, ${batch.isSoldOut}, ${batch.isFCFS || false}
          )
          ON CONFLICT (id)
          DO UPDATE SET
            price = ${batch.price}, 
            minted_wallets = ${batch.mintedWallets},
            minted_tigers = ${mintedTigers},
            max_wallets = ${batch.maxWallets}, 
            ordinals = ${batch.ordinals}, 
            is_sold_out = ${batch.isSoldOut}, 
            is_fcfs = ${batch.isFCFS || false}
        `
      );
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
    const { rows } = await withRetry(async () => 
      await sql`SELECT * FROM whitelist ORDER BY created_at`
    );
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
    // In plaats van TRUNCATE, gebruik DELETE en daarna individuele INSERT operaties
    await withRetry(async () => await sql`DELETE FROM whitelist`);
    
    for (const entry of entries) {
      await withRetry(async () =>
        await sql`
          INSERT INTO whitelist (address, batch_id, created_at)
          VALUES (${entry.address}, ${entry.batchId}, ${entry.createdAt})
          ON CONFLICT (address)
          DO UPDATE SET
            batch_id = ${entry.batchId},
            created_at = ${entry.createdAt}
        `
      );
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
    const { rows } = await withRetry(async () => 
      await sql`SELECT * FROM current_batch LIMIT 1`
    );
    
    // Debug logging toevoegen
    console.log('getCurrentBatch data from database:', JSON.stringify(rows, null, 2));
    
    if (rows.length > 0) {
      const result = {
        currentBatch: rows[0].current_batch,
        soldOutAt: rows[0].sold_out_at ? new Date(rows[0].sold_out_at).getTime() : null
      };
      console.log('Returning current batch info:', JSON.stringify(result, null, 2));
      return result;
    }
    
    // Default values if no record exists
    console.log('No current batch data found, returning defaults');
    return { currentBatch: 1, soldOutAt: null };
  } catch (error) {
    console.error('Error getting current batch from database:', error);
    return { currentBatch: 1, soldOutAt: null };
  }
}

// Save current batch info
export async function saveCurrentBatch(data: { currentBatch: number, soldOutAt: number | null }): Promise<boolean> {
  try {
    await withRetry(async () => await sql`TRUNCATE current_batch`);
    await withRetry(async () =>
      await sql`
        INSERT INTO current_batch (current_batch, sold_out_at)
        VALUES (${data.currentBatch}, ${data.soldOutAt ? new Date(data.soldOutAt).toISOString() : null})
      `
    );
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
    const { rows } = await withRetry(async () => 
      await sql`SELECT * FROM minted_wallets ORDER BY timestamp`
    );
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
    // Gebruik UPSERT logica in plaats van TRUNCATE voor minted wallets
    await withRetry(async () => await sql`TRUNCATE minted_wallets`);
    
    for (const wallet of wallets) {
      await withRetry(async () =>
        await sql`
          INSERT INTO minted_wallets (address, batch_id, quantity, timestamp)
          VALUES (${wallet.address}, ${wallet.batchId}, ${wallet.quantity}, ${wallet.timestamp})
        `
      );
    }
    return true;
  } catch (error) {
    console.error('Error saving minted wallets to database:', error);
    return false;
  }
}

// Directe TRUNCATE functie voor orders
export async function truncateOrders(): Promise<boolean> {
  try {
    await withRetry(async () => await sql`TRUNCATE orders RESTART IDENTITY CASCADE`);
    console.log('Orders truncated successfully via direct SQL TRUNCATE');
    return true;
  } catch (error) {
    console.error('Error truncating orders table:', error);
    return false;
  }
}

// Directe TRUNCATE functie voor minted wallets
export async function truncateMintedWallets(): Promise<boolean> {
  try {
    await withRetry(async () => await sql`TRUNCATE minted_wallets RESTART IDENTITY CASCADE`);
    console.log('Minted wallets truncated successfully via direct SQL TRUNCATE');
    return true;
  } catch (error) {
    console.error('Error truncating minted_wallets table:', error);
    return false;
  }
} 