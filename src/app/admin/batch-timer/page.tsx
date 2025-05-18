'use client';

import React, { useState, useEffect } from 'react';
import { FaClock, FaPlay, FaStop, FaSave } from 'react-icons/fa';

interface BatchDuration {
  batchId: number;
  duration: number;
  startTime: number | null;
  endTime: number | null;
  isActive: boolean;
  timeRemaining: number | null;
}

export default function BatchTimerPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [batchDurations, setBatchDurations] = useState<BatchDuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  
  // Timer state
  const [timerRefresh, setTimerRefresh] = useState<NodeJS.Timeout | null>(null);
  
  // Authentication
  const authenticate = async () => {
    try {
      const response = await fetch(`/api/admin?password=${encodeURIComponent(password)}&action=dashboard`);
      
      if (response.ok) {
        setIsAuthenticated(true);
        // Store in localStorage for convenience
        localStorage.setItem('adminPassword', password);
        loadBatchDurations();
      } else {
        setError('Authenticatie mislukt. Controleer het wachtwoord.');
      }
    } catch (error) {
      setError('Er is een fout opgetreden bij authenticatie.');
      console.error('Authentication error:', error);
    }
  };
  
  // Load batch durations
  const loadBatchDurations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/batch-timer?password=${encodeURIComponent(password)}`);
      
      if (response.ok) {
        const data = await response.json();
        setBatchDurations(data.durations || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fout bij ophalen van batch timers');
      }
    } catch (error) {
      setError('Er is een fout opgetreden bij het ophalen van batch timers');
      console.error('Load batch durations error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Set batch duration
  const handleSetDuration = async () => {
    if (selectedBatchId === '') {
      setError('Selecteer een batch');
      return;
    }
    
    if (durationMinutes <= 0) {
      setError('Duur moet groter zijn dan 0 minuten');
      return;
    }
    
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/batch-timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchId: selectedBatchId,
          action: 'set',
          durationMinutes,
          password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message);
        loadBatchDurations();
        
        // Reset form if setting a new batch duration
        if (selectedBatchId !== '') {
          setSelectedBatchId('');
          setDurationMinutes(60);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fout bij instellen van batch timer');
      }
    } catch (error) {
      setError('Er is een fout opgetreden bij het instellen van de batch timer');
      console.error('Set batch duration error:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Start batch timer
  const handleStartTimer = async (batchId: number) => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/batch-timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchId,
          action: 'start',
          password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message);
        loadBatchDurations();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fout bij starten van batch timer');
      }
    } catch (error) {
      setError('Er is een fout opgetreden bij het starten van de batch timer');
      console.error('Start batch timer error:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Stop batch timer
  const handleStopTimer = async (batchId: number) => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/batch-timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchId,
          action: 'stop',
          password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message);
        loadBatchDurations();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fout bij stoppen van batch timer');
      }
    } catch (error) {
      setError('Er is een fout opgetreden bij het stoppen van de batch timer');
      console.error('Stop batch timer error:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Format time left
  const formatTimeLeft = (milliseconds: number) => {
    if (!milliseconds || milliseconds <= 0) return '00:00:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };
  
  // Auto-refresh active timers
  useEffect(() => {
    if (isAuthenticated) {
      // Set up a timer to refresh batch durations
      const intervalId = setInterval(() => {
        if (batchDurations.some(batch => batch.isActive)) {
          loadBatchDurations();
        }
      }, 5000); // Refresh every 5 seconds if there are active timers
      
      setTimerRefresh(intervalId);
      
      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [isAuthenticated, batchDurations]);
  
  // Check for stored password
  useEffect(() => {
    const storedPassword = localStorage.getItem('adminPassword');
    if (storedPassword) {
      setPassword(storedPassword);
      setIsAuthenticated(true);
      loadBatchDurations();
    } else {
      setLoading(false);
    }
  }, []);
  
  // Generate batch options
  const batchOptions = Array.from({ length: 16 }, (_, i) => i + 1);
  
  if (loading && !isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">Laden...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Voer admin wachtwoord in"
              onKeyDown={(e) => e.key === 'Enter' && authenticate()}
            />
          </div>
          
          <div className="flex items-center justify-center">
            <button
              onClick={authenticate}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Inloggen
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Batch Timer Beheer</h1>
          <button 
            onClick={() => window.location.href = '/admin'}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Terug naar Dashboard
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Timer instellen */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaClock className="mr-2" /> Timer Instellen
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Selecteer Batch
                </label>
                <select 
                  value={selectedBatchId} 
                  onChange={(e) => setSelectedBatchId(e.target.value ? parseInt(e.target.value) : '')}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">-- Selecteer Batch --</option>
                  {batchOptions.map(batchId => (
                    <option key={batchId} value={batchId}>
                      Batch #{batchId}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Duur (minuten)
                </label>
                <input 
                  type="number" 
                  min="1" 
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              
              <button
                onClick={handleSetDuration}
                disabled={actionLoading || selectedBatchId === ''}
                className={`flex items-center justify-center w-full py-2 px-4 rounded font-bold ${
                  actionLoading || selectedBatchId === '' 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-700 text-white'
                }`}
              >
                <FaSave className="mr-2" /> Timer Instellen
              </button>
            </div>
          </div>
          
          {/* Timer Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Timer Instructies</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Stel eerst de duur in voor de batch (in minuten)</li>
              <li>Start daarna de timer voor een specifieke batch</li>
              <li>Zodra de timer start, wordt de batch geopend voor die periode</li>
              <li>Als de timer afloopt, wordt de batch automatisch gemarkeerd als &quot;sold out&quot;</li>
              <li>Je kunt een actieve timer handmatig stoppen indien nodig</li>
              <li>Je kunt de duur op elk moment aanpassen, ook voor lopende timers</li>
            </ul>
          </div>
        </div>
        
        {/* Batch Timer Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Batch Timer Status</h2>
          
          {loading ? (
            <p>Laden...</p>
          ) : batchDurations.length === 0 ? (
            <p>Geen batch timers geconfigureerd</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="py-2 px-4 border-r text-left">Batch</th>
                    <th className="py-2 px-4 border-r text-left">Duur (min)</th>
                    <th className="py-2 px-4 border-r text-left">Status</th>
                    <th className="py-2 px-4 border-r text-left">Resterende Tijd</th>
                    <th className="py-2 px-4 text-left">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {batchOptions.map(batchId => {
                    const batchData = batchDurations.find(b => b.batchId === batchId);
                    return (
                      <tr key={batchId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-4 border-r">Batch #{batchId}</td>
                        <td className="py-2 px-4 border-r">
                          {batchData ? batchData.duration : "Niet ingesteld"}
                        </td>
                        <td className="py-2 px-4 border-r">
                          {batchData && batchData.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Actief
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactief
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-4 border-r">
                          {batchData && batchData.isActive && batchData.timeRemaining ? (
                            <span className="font-mono">
                              {formatTimeLeft(batchData.timeRemaining)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex space-x-2">
                            {(!batchData || !batchData.isActive) ? (
                              <button
                                onClick={() => handleStartTimer(batchId)}
                                disabled={actionLoading || !batchData}
                                className={`flex items-center justify-center px-3 py-1 rounded text-xs font-medium ${
                                  actionLoading || !batchData
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                              >
                                <FaPlay className="mr-1" /> Start
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStopTimer(batchId)}
                                disabled={actionLoading}
                                className={`flex items-center justify-center px-3 py-1 rounded text-xs font-medium ${
                                  actionLoading
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                              >
                                <FaStop className="mr-1" /> Stop
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 