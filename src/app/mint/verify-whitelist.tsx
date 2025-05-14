import { useState, useEffect } from 'react';

export default function VerifyWhitelist() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentBatch, setCurrentBatch] = useState<number>(1);
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [targetBatch, setTargetBatch] = useState<number>(1);
  
  // Load whitelist (admin only)
  const loadWhitelist = async () => {
    if (!adminPassword) {
      setError('Admin password required');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/whitelist-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_whitelist',
          password: adminPassword
        }),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load whitelist: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Whitelist data:', data);
      
      if (data.success && data.whitelist) {
        setWhitelist(data.whitelist);
        setIsAdmin(true);
      } else {
        setError(data.error || 'Unknown error loading whitelist');
      }
    } catch (err: any) {
      console.error('Error loading whitelist:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add address to whitelist (admin only)
  const addToWhitelist = async () => {
    if (!isAdmin) {
      setError('Admin access required');
      return;
    }
    
    if (!address.startsWith('bc1p')) {
      setError('Invalid Ordinal address format, must start with bc1p');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/whitelist-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_to_whitelist',
          address: address,
          batchId: targetBatch,
          password: adminPassword
        }),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add to whitelist: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Add to whitelist response:', data);
      
      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          entry: data.entry
        });
        // Refresh whitelist
        loadWhitelist();
      } else {
        setError(data.error || 'Unknown error adding to whitelist');
      }
    } catch (err: any) {
      console.error('Error adding to whitelist:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verify address
  const verifyAddress = async () => {
    if (!address.startsWith('bc1p')) {
      setError('Invalid Ordinal address format, must start with bc1p');
      return;
    }
    
    setIsLoading(true);
    try {
      // Add a timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/mint/verify?batchId=${currentBatch}&address=${encodeURIComponent(address)}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      const data = await response.json();
      console.log('Verify response:', data);
      
      setResult(data);
    } catch (err: any) {
      console.error('Error verifying address:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch current batch on load
  useEffect(() => {
    const fetchCurrentBatch = async () => {
      try {
        const response = await fetch('/api/mint/current-batch', {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch current batch: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Current batch data:', data);
        
        if (data.currentBatch) {
          setCurrentBatch(data.currentBatch);
          setTargetBatch(data.currentBatch);
        }
      } catch (err: any) {
        console.error('Error fetching current batch:', err);
      }
    };
    
    fetchCurrentBatch();
  }, []);
  
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: "'Press Start 2P', monospace"
    }}>
      <h2 style={{ color: '#ffd700' }}>Whitelist Verification Tool</h2>
      
      {/* Admin Login */}
      {!isAdmin && (
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #333',
          borderRadius: '4px'
        }}>
          <h3 style={{ color: '#ffd700', fontSize: '14px' }}>ADMIN LOGIN</h3>
          <div style={{ marginBottom: '10px' }}>
            <input 
              type="password"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'black',
                color: 'white',
                border: '1px solid #ffd700'
              }}
            />
          </div>
          <button
            onClick={loadWhitelist}
            disabled={isLoading}
            style={{
              backgroundColor: '#ffd700',
              color: 'black',
              border: 'none',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {isLoading ? 'Loading...' : 'Login'}
          </button>
        </div>
      )}
      
      {/* Address Input */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        border: '1px solid #333',
        borderRadius: '4px'
      }}>
        <h3 style={{ color: '#ffd700', fontSize: '14px' }}>ADDRESS VERIFICATION</h3>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="text"
            placeholder="Enter bc1p... address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'black',
              color: 'white',
              border: '1px solid #ffd700'
            }}
          />
        </div>
        
        {/* Current Batch */}
        <div style={{ 
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <label style={{ fontSize: '12px' }}>Current Batch:</label>
          <div style={{ 
            padding: '5px 10px',
            backgroundColor: '#222',
            color: '#ffd700',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            #{currentBatch}
          </div>
        </div>
        
        {/* Admin Controls */}
        {isAdmin && (
          <div style={{ 
            marginBottom: '15px',
            border: '1px solid #444',
            padding: '10px',
            borderRadius: '4px'
          }}>
            <h4 style={{ color: '#ffd700', fontSize: '12px', marginBottom: '10px' }}>ADMIN CONTROLS</h4>
            
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '11px' }}>Target Batch:</label>
              <select 
                value={targetBatch}
                onChange={(e) => setTargetBatch(Number(e.target.value))}
                style={{
                  padding: '5px',
                  backgroundColor: 'black',
                  color: 'white',
                  border: '1px solid #ffd700'
                }}
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i+1} value={i+1}>Batch #{i+1}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={addToWhitelist}
              disabled={isLoading}
              style={{
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px',
                marginRight: '10px'
              }}
            >
              {isLoading ? 'Processing...' : `Add to Batch #${targetBatch}`}
            </button>
          </div>
        )}
        
        <button
          onClick={verifyAddress}
          disabled={isLoading}
          style={{
            backgroundColor: '#ffd700',
            color: 'black',
            border: 'none',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isLoading ? 'Verifying...' : 'Verify Address'}
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div style={{ 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid #ff0000',
          color: '#ff0000',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      {/* Result Display */}
      {result && (
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: result.eligible ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 200, 0, 0.1)',
          border: `1px solid ${result.eligible ? '#00ff00' : '#ffcc00'}`,
          borderRadius: '4px'
        }}>
          <h3 style={{ 
            color: result.eligible ? '#00ff00' : '#ffcc00', 
            fontSize: '14px',
            marginBottom: '10px'
          }}>
            {result.eligible ? '✅ ELIGIBLE' : '⚠️ NOT ELIGIBLE'}
          </h3>
          
          <div style={{ fontSize: '12px' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {/* Whitelist Display (Admin Only) */}
      {isAdmin && whitelist.length > 0 && (
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #333',
          borderRadius: '4px'
        }}>
          <h3 style={{ color: '#ffd700', fontSize: '14px', marginBottom: '10px' }}>WHITELIST ENTRIES ({whitelist.length})</h3>
          
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            border: '1px solid #333',
            padding: '5px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #333', fontSize: '11px' }}>Batch</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #333', fontSize: '11px' }}>Address</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #333', fontSize: '11px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.map((entry, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '6px', fontSize: '10px', color: entry.batchId === currentBatch ? '#ffd700' : 'white' }}>
                      #{entry.batchId}
                    </td>
                    <td style={{ padding: '6px', fontSize: '10px', fontFamily: 'monospace' }}>
                      {entry.address.substring(0, 12)}...{entry.address.substring(entry.address.length - 4)}
                    </td>
                    <td style={{ padding: '6px', fontSize: '10px' }}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 