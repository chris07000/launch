'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ResetAllPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const resetEverything = async () => {
    setLoading(true);
    setError('');
    setResult('');
    
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'admin123',
          action: 'resetAll'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data.message || 'Alle data is succesvol gereset.');
      } else {
        setError(data.error || 'Er is een fout opgetreden bij het resetten van de data.');
      }
    } catch (error) {
      setError('Er is een fout opgetreden bij het resetten van de data.');
      console.error('Reset error:', error);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#000', 
      color: '#fff',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ 
        color: '#ff6b6b', 
        borderBottom: '1px solid #ff6b6b',
        paddingBottom: '10px'
      }}>
        Reset Alle Data
      </h1>
      
      <div style={{ marginBottom: '30px' }}>
        <Link href="/admin" style={{ 
          color: '#aaa', 
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '20px' 
        }}>
          ← Terug naar Admin
        </Link>
      </div>
      
      <div style={{
        border: '1px solid #ff6b6b',
        borderRadius: '5px',
        padding: '20px',
        marginBottom: '30px',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
      }}>
        <h2 style={{ color: '#ff6b6b', margin: '0 0 15px 0' }}>⚠️ WAARSCHUWING ⚠️</h2>
        <p>Door op de knop hieronder te klikken, zullen de volgende gegevens permanent worden gewist:</p>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Alle whitelisted adressen</li>
          <li>Alle orders</li>
          <li>Alle inscriptions</li>
          <li>Alle batch data (gereset naar standaardwaarden)</li>
          <li>Alle wallet tracking</li>
        </ul>
        <p style={{ fontWeight: 'bold', color: '#ff6b6b' }}>
          Deze actie kan niet ongedaan worden gemaakt!
        </p>
      </div>
      
      {result && (
        <div style={{
          backgroundColor: 'rgba(46, 213, 115, 0.1)',
          border: '1px solid #2ed573',
          borderRadius: '5px',
          padding: '15px',
          marginBottom: '20px',
          color: '#2ed573'
        }}>
          {result}
        </div>
      )}
      
      {error && (
        <div style={{
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid #ff6b6b',
          borderRadius: '5px',
          padding: '15px',
          marginBottom: '20px',
          color: '#ff6b6b'
        }}>
          {error}
        </div>
      )}
      
      <button 
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        style={{
          backgroundColor: '#ff6b6b',
          color: '#fff',
          border: 'none',
          padding: '12px 25px',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          fontSize: '16px'
        }}
      >
        {loading ? 'Bezig met resetten...' : 'RESET ALLE DATA'}
      </button>
      
      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#111',
            padding: '25px',
            borderRadius: '8px',
            maxWidth: '500px',
            border: '1px solid #ff6b6b',
            boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)'
          }}>
            <h2 style={{ color: '#ff6b6b', margin: '0 0 20px 0' }}>Bevestig Reset</h2>
            <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
              Weet je zeker dat je alle data wilt resetten? Deze actie kan niet ongedaan worden gemaakt!
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowConfirm(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#aaa',
                  border: '1px solid #aaa',
                  padding: '8px 15px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                Annuleren
              </button>
              <button 
                onClick={resetEverything}
                style={{
                  backgroundColor: '#ff6b6b',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
              >
                Bevestig Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 