import { sql } from '@vercel/postgres';
import { initializeDatabase } from './db';

const defaultBatches = [
  { id: 1, price: 250.00, maxWallets: 33, ordinals: 66 },
  { id: 2, price: 260.71, maxWallets: 33, ordinals: 66 },
  { id: 3, price: 271.43, maxWallets: 33, ordinals: 66 },
  { id: 4, price: 282.14, maxWallets: 33, ordinals: 66 },
  { id: 5, price: 292.86, maxWallets: 33, ordinals: 66 },
  { id: 6, price: 303.57, maxWallets: 33, ordinals: 66 },
  { id: 7, price: 314.29, maxWallets: 33, ordinals: 66 },
  { id: 8, price: 325.00, maxWallets: 33, ordinals: 66 },
  { id: 9, price: 335.71, maxWallets: 33, ordinals: 66 },
  { id: 10, price: 346.43, maxWallets: 33, ordinals: 66 },
  { id: 11, price: 357.14, maxWallets: 33, ordinals: 66 },
  { id: 12, price: 367.86, maxWallets: 33, ordinals: 66 },
  { id: 13, price: 378.57, maxWallets: 33, ordinals: 66 },
  { id: 14, price: 389.29, maxWallets: 33, ordinals: 66 },
  { id: 15, price: 400.00, maxWallets: 33, ordinals: 66 },
  { id: 16, price: 450.00, maxWallets: 33, ordinals: 66 }
];

async function importDefaultBatches() {
  try {
    // Check if batches already exist
    const { rows } = await sql`SELECT COUNT(*) as count FROM batches`;
    
    if (rows[0].count === 0) {
      // Import default batches if none exist
      for (const batch of defaultBatches) {
        await sql`
          INSERT INTO batches (id, price, max_wallets, ordinals, minted_wallets, is_sold_out)
          VALUES (${batch.id}, ${batch.price}, ${batch.maxWallets}, ${batch.ordinals}, 0, false)
        `;
      }
      console.log('Default batches imported successfully');
    } else {
      console.log('Batches already exist, skipping import');
    }
  } catch (error) {
    console.error('Error importing default batches:', error);
  }
}

export async function initializeApp() {
  try {
    // Initialize database tables
    await initializeDatabase();
    console.log('Database initialized');

    // Import default batches
    await importDefaultBatches();
    console.log('App initialization completed');
  } catch (error) {
    console.error('Error during app initialization:', error);
    throw error;
  }
} 