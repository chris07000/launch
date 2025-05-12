import { sql } from '@vercel/postgres';

export async function syncOrdersToBatches() {
  try {
    // Get all paid/completed orders
    const { rows: orders } = await sql`
      SELECT batch_id, COUNT(*) as count 
      FROM orders 
      WHERE status IN ('paid', 'completed') 
      GROUP BY batch_id
    `;

    // Update minted_wallets count for each batch
    for (const order of orders) {
      await sql`
        UPDATE batches 
        SET minted_wallets = ${order.count}
        WHERE id = ${order.batch_id}
      `;

      // Check if batch is now sold out
      const { rows: batchInfo } = await sql`
        SELECT minted_wallets, max_wallets 
        FROM batches 
        WHERE id = ${order.batch_id}
      `;

      if (batchInfo.length > 0 && batchInfo[0].minted_wallets >= batchInfo[0].max_wallets) {
        // Mark batch as sold out if not already marked
        await sql`
          INSERT INTO batch_sold_out_times (batch_id, sold_out_at)
          VALUES (${order.batch_id}, ${new Date().toISOString()}::timestamp)
          ON CONFLICT (batch_id) DO NOTHING
        `;

        // Update batch status
        await sql`
          UPDATE batches
          SET is_sold_out = true
          WHERE id = ${order.batch_id}
        `;
      }
    }

    return true;
  } catch (error) {
    console.error('Error syncing orders to batches:', error);
    return false;
  }
} 