'use client';

import { useState, useEffect } from 'react';
import { getOrders } from '@/lib/storage';

export default function DebugPage() {
  const [ordersData, setOrdersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        console.log('Fetching orders...');
        const orders = await getOrders();
        console.log('Orders from storage:', orders);
        
        // Try to read directly from /tmp/orders.json
        try {
          const fs = require('fs');
          const path = require('path');
          const os = require('os');
          const tmpDir = os.tmpdir();
          const ordersFile = path.join(tmpDir, 'orders.json');
          
          if (fs.existsSync(ordersFile)) {
            const rawData = fs.readFileSync(ordersFile, 'utf8');
            console.log('Raw orders from file:', rawData);
          } else {
            console.log('Orders file does not exist in:', ordersFile);
          }
        } catch (fsError) {
          console.error('Error reading orders file:', fsError);
        }

        setOrdersData({
          success: true,
          orders,
          count: orders.length
        });
      } catch (err) {
        console.error('Error in fetchOrders:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  if (loading) return <div>Loading orders data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Debug Orders</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Orders Info</h2>
        <p>Orders found: {ordersData?.count || 0}</p>
        <p>Success: {ordersData?.success ? 'Yes' : 'No'}</p>
        {ordersData?.error && <p>Error: {ordersData.error}</p>}
      </div>
      
      {ordersData?.orders && (
        <div>
          <h2>Orders Contents</h2>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '500px'
          }}>
            {JSON.stringify(ordersData.orders, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h2>Environment Info</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '5px'
        }}>
          {JSON.stringify({
            tmpDir: require('os').tmpdir(),
            cwd: process.cwd(),
            env: {
              NODE_ENV: process.env.NODE_ENV,
              VERCEL_ENV: process.env.VERCEL_ENV
            }
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
} 