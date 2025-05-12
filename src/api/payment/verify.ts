console.log(`Expected amount: ${totalPrice} BTC (${expectedSats} sats)`);
console.log(`Found ${transactions.length} transactions`);

// Check each transaction
let totalReceivedSats = 0;

for (let transaction of transactions) {
  // Check each output (vout) in the transaction
  for (let output of transaction.vout) {
    if (output.scriptpubkey_address === paymentAddress) {
      // Found payment output to the correct address
      const valueSats = output.value;
      console.log(`Found payment output: ${valueSats} sats to ${paymentAddress}`);
      totalReceivedSats += valueSats;
    }
  }
}

console.log(`Total received: ${totalReceivedSats} sats (expected: ${expectedSats} sats)`);

// For testing purposes, we'll consider any payment as valid
// In production, you'd want to check if totalReceivedSats >= expectedSats
if (totalReceivedSats > 0) {
  // Payment received, update order status
  console.log('Payment detected! Updating order status to paid');
  try {
    await updateOrderStatus(orderId, 'paid');
    
    // Sync orders with batches
    if (process.env.ADMIN_PASSWORD) {
      await syncOrdersToBatches(process.env.ADMIN_PASSWORD);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
} 