/**
 * Vercel Deployment Script
 * This script is used to initialize the database during Vercel deployment
 */

const { sql } = require('@vercel/postgres');

const defaultBatches = [
  { id: 1, price: 250.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 2, price: 260.71, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 3, price: 271.43, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 4, price: 282.14, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 5, price: 292.86, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 6, price: 303.57, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 7, price: 314.29, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 8, price: 325.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 9, price: 335.71, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 10, price: 346.43, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 11, price: 357.14, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 12, price: 367.86, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 13, price: 378.57, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 14, price: 389.29, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 15, price: 400.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 16, price: 450.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false, isFCFS: true }
];

async function main() {
  console.log('Starting Vercel deployment initialization...');
  
  try {
    // Step 1: Create tables
    console.log('Creating tables...');
    
    // Orders table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        btc_address VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        total_price DECIMAL(20,8) NOT NULL,
        total_price_usd DECIMAL(10,2) NOT NULL,
        price_per_unit DECIMAL(10,2) NOT NULL,
        price_per_unit_btc DECIMAL(20,8) NOT NULL,
        batch_id INTEGER NOT NULL,
        payment_address VARCHAR(255) NOT NULL,
        payment_reference VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        inscription_id VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Batches table
    await sql`
      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY,
        price DECIMAL(10,2) NOT NULL,
        minted_wallets INTEGER NOT NULL DEFAULT 0,
        max_wallets INTEGER NOT NULL,
        ordinals INTEGER NOT NULL,
        is_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
        is_fcfs BOOLEAN NOT NULL DEFAULT FALSE
      )
    `;
    
    // Whitelist table
    await sql`
      CREATE TABLE IF NOT EXISTS whitelist (
        address VARCHAR(255) PRIMARY KEY,
        batch_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `;
    
    // Minted wallets table
    await sql`
      CREATE TABLE IF NOT EXISTS minted_wallets (
        address VARCHAR(255) NOT NULL,
        batch_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (address, batch_id)
      )
    `;
    
    // Used transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS used_transactions (
        tx_id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        amount DECIMAL(20,8) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Current batch table
    await sql`
      CREATE TABLE IF NOT EXISTS current_batch (
        id SERIAL PRIMARY KEY,
        current_batch INTEGER NOT NULL DEFAULT 1,
        sold_out_at TIMESTAMP
      )
    `;
    
    // Mint start table
    await sql`
      CREATE TABLE IF NOT EXISTS mint_start (
        id INTEGER PRIMARY KEY DEFAULT 1,
        start_time TIMESTAMP
      )
    `;
    
    // Batch cooldown table
    await sql`
      CREATE TABLE IF NOT EXISTS batch_cooldown (
        id INTEGER PRIMARY KEY DEFAULT 1,
        value INTEGER NOT NULL DEFAULT 15,
        unit VARCHAR(20) NOT NULL DEFAULT 'minutes'
      )
    `;
    
    // Inscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS inscriptions (
        id VARCHAR(255) PRIMARY KEY,
        image_url TEXT NOT NULL,
        batch INTEGER NOT NULL DEFAULT 1,
        assigned_to_order VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Sold out times table
    await sql`
      CREATE TABLE IF NOT EXISTS batch_sold_out_times (
        batch_id INTEGER PRIMARY KEY,
        sold_out_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Step 2: Import batches if they don't exist
    console.log('Importing batches...');
    const { rows } = await sql`SELECT COUNT(*) as count FROM batches`;
    
    if (parseInt(rows[0].count) === 0) {
      console.log('No batches found, importing defaults...');
      for (const batch of defaultBatches) {
        await sql`
          INSERT INTO batches (id, price, minted_wallets, max_wallets, ordinals, is_sold_out, is_fcfs)
          VALUES (${batch.id}, ${batch.price}, ${batch.mintedWallets}, ${batch.maxWallets}, ${batch.ordinals}, ${batch.isSoldOut}, ${batch.isFCFS || false})
        `;
      }
      console.log('Batches imported successfully');
    } else {
      console.log(`Found ${rows[0].count} existing batches, skipping import`);
    }
    
    // Step 3: Set up current batch if it doesn't exist
    console.log('Setting up current batch...');
    const currentBatchResult = await sql`SELECT COUNT(*) as count FROM current_batch`;
    
    if (parseInt(currentBatchResult.rows[0].count) === 0) {
      console.log('No current batch record found, creating default...');
      await sql`INSERT INTO current_batch (current_batch, sold_out_at) VALUES (1, NULL)`;
    }
    
    // Step 4: Set up batch cooldown if it doesn't exist
    console.log('Setting up batch cooldown...');
    const cooldownResult = await sql`SELECT COUNT(*) as count FROM batch_cooldown`;
    
    if (parseInt(cooldownResult.rows[0].count) === 0) {
      console.log('No batch cooldown record found, creating default...');
      await sql`INSERT INTO batch_cooldown (value, unit) VALUES (15, 'minutes')`;
    }
    
    console.log('Vercel deployment initialization completed successfully!');
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
}

main(); 