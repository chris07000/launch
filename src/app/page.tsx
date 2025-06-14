'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaTwitter, FaDiscord, FaBitcoin } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { fetchApi, handleApiError } from '@/lib/api';

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<number>(1);
  const [mintedTigers, setMintedTigers] = useState<number>(0);
  const [totalTigers, setTotalTigers] = useState<number>(66);
  const [loading, setLoading] = useState(true);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [btcAddress, setBtcAddress] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [checkResult, setCheckResult] = useState('');
  const [timeToMint, setTimeToMint] = useState<number | null>(null);
  const [cachedMintedTigers, setCachedMintedTigers] = useState<number>(0);
  const [cachedTotalTigers, setCachedTotalTigers] = useState<number>(66);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [formattedTimeLeft, setFormattedTimeLeft] = useState<string>('0m 0s');
  const [batchTimerActive, setBatchTimerActive] = useState<boolean>(false);
  const [batchTimerEndTime, setBatchTimerEndTime] = useState<number | null>(null);
  const [batchTimerTimeLeft, setBatchTimerTimeLeft] = useState<number | null>(null);
  const [formattedBatchTimerTimeLeft, setFormattedBatchTimerTimeLeft] = useState<string>('');
  const router = useRouter();

  // Detect mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    
    // Initial check
    checkIfMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Fetch time rendering effect separately
  useEffect(() => {
    // Format time and update every second
    const updateFormattedTime = () => {
      if (isSoldOut && timeLeft > 0) {
        setFormattedTimeLeft(formatTimeLeft(timeLeft * 1000));
      } else {
        setFormattedTimeLeft('0m 0s');
      }

      // Update batch timer formatted time if active
      if (batchTimerActive && batchTimerTimeLeft !== null && batchTimerTimeLeft > 0) {
        setFormattedBatchTimerTimeLeft(formatTimeLeft(batchTimerTimeLeft));
      } else if (batchTimerActive && batchTimerTimeLeft !== null && batchTimerTimeLeft <= 0) {
        setFormattedBatchTimerTimeLeft('0m 0s');
      }
    };
    
    // Update initially
    updateFormattedTime();
    
    // Set interval to update every second
    const formattingInterval = setInterval(updateFormattedTime, 1000);
    
    // Clean up
    return () => clearInterval(formattingInterval);
  }, [timeLeft, isSoldOut, batchTimerActive, batchTimerTimeLeft]);

  // Aparte timer voor aftellen zonder pagina-refresh
  useEffect(() => {
    if (isSoldOut && timeLeft > 0) {
      const timerInterval = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(timerInterval);
    }
  }, [isSoldOut]);

  // Separate timer for batch timer countdown
  useEffect(() => {
    if (batchTimerActive && batchTimerEndTime) {
      const updateBatchTimer = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, batchTimerEndTime - now);
        setBatchTimerTimeLeft(timeLeft);
        
        // If timer has just finished, reload to get updated batch status
        if (timeLeft <= 0 && batchTimerTimeLeft && batchTimerTimeLeft > 1000) {
          window.location.reload();
        }
      };
      
      // Initial update
      updateBatchTimer();
      
      // Set interval to update every second
      const timerInterval = setInterval(updateBatchTimer, 1000);
      
      // Clean up
      return () => clearInterval(timerInterval);
    }
  }, [batchTimerActive, batchTimerEndTime, batchTimerTimeLeft]);

  // Effect voor controle of timer bijna op 0 staat
  useEffect(() => {
    if (isSoldOut && timeLeft <= 1) {
      console.log("Timer nearly zero, forcing priority cooldown check...");
      fetch('/api/check-cooldown-and-advance?priority=true', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }).then(response => response.json())
        .then(data => {
          console.log("Priority cooldown check response:", data);
          if (data.status === 'advanced') {
            console.log("Batch advanced, refreshing data...");
            window.location.reload();
          }
        })
        .catch(error => {
          console.error("Error in priority check:", error);
        });
    }
  }, [timeLeft, isSoldOut]);
  
  // Effect for fetching current batch - only refetch on interval, not on every state change
  useEffect(() => {
    const fetchBatchInfo = async () => {
      try {
        setLoading(true);
        // Get current batch status
        const response = await fetch('/api/mint/current-batch');
        const data = await response.json();
        
        if (data.currentBatch) {
          setCurrentBatch(data.currentBatch);
        }

        if (data.soldOut) {
          setIsSoldOut(true);
          if (data.timeLeft) {
            setTimeLeft(Math.floor(data.timeLeft / 1000));
          }
        } else {
          setIsSoldOut(false);
          setTimeLeft(0);
        }

        // Check if batch has an active timer
        if (data.hasTimer && data.timerEndTime) {
          setBatchTimerActive(true);
          setBatchTimerEndTime(data.timerEndTime);
          if (data.timeLeft) {
            setBatchTimerTimeLeft(data.timeLeft);
          }
        } else {
          setBatchTimerActive(false);
          setBatchTimerEndTime(null);
          setBatchTimerTimeLeft(null);
        }

        const mintedTigersCount = data.mintedTigers || 0;
        const totalTigersCount = data.totalTigers || 66;
        
        // Pas de weergegeven waarden alleen aan bij echte veranderingen
        if (mintedTigersCount !== cachedMintedTigers || totalTigersCount !== cachedTotalTigers) {
          setMintedTigers(mintedTigersCount);
          setTotalTigers(totalTigersCount);
          setCachedMintedTigers(mintedTigersCount);
          setCachedTotalTigers(totalTigersCount);
          // Bereken percentage stabiel
          setProgressPercentage(Math.min(100, Math.round((mintedTigersCount / totalTigersCount) * 100)));
        }
        
        // Update last refresh time
        setLastRefreshTime(Date.now());
      } catch (error) {
        console.error('Error fetching current batch:', error);
      } finally {
        setLoading(false);
      }
    };

    let timerInterval: NodeJS.Timeout;

    const checkMintStartTime = async () => {
      try {
        const response = await fetch('/api/mint-start');
        const data = await response.json();
        
        if (data.startTime && data.startTime > 0) {
          // Clear any existing interval
          if (timerInterval) {
            clearInterval(timerInterval);
          }

          const updateTimer = () => {
            const now = Date.now();
            const timeLeft = Math.max(0, data.startTime - now);
            setTimeToMint(timeLeft);

            if (timeLeft <= 0) {
              clearInterval(timerInterval);
            }
          };

          // Initial update
          updateTimer();

          // Set up new interval
          timerInterval = setInterval(updateTimer, 1000);
        } else {
          setTimeToMint(0);
        }
      } catch (error) {
        console.error('Error checking mint start time:', error);
        setTimeToMint(0);
      }
    };

    // Initial checks
    fetchBatchInfo();
    checkMintStartTime();
    
    // Set up intervals - ONLY fetch batch info on intervals, not on every render
    const batchInterval = setInterval(fetchBatchInfo, 30000);
    
    const checkCooldownInterval = setInterval(() => {
      // Check cooldown status periodically, not on render
      fetch('/api/check-cooldown-and-advance', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }).then(response => response.json())
        .then(data => {
          if (data.status === 'advanced') {
            console.log(`Batch advanced from ${data.previousBatch} to ${data.newBatch}`);
            fetchBatchInfo();
          }
        })
        .catch(error => {
          console.error('Error checking cooldown and advance:', error);
        });
    }, 15000);

    // Cleanup function
    return () => {
      clearInterval(batchInterval);
      clearInterval(checkCooldownInterval);
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, []); // Geen dependencies zodat deze alleen bij mount draait

  // Format time function
  const formatTimeLeft = (milliseconds: number) => {
    if (milliseconds <= 0) return "0m 0s";
    
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    
    let formattedTime = "";
    
    if (days > 0) {
      formattedTime += `${days}d `;
    }
    
    if (hours > 0 || days > 0) {
      formattedTime += `${hours}h `;
    }
    
    formattedTime += `${minutes}m`;
    
    // Add seconds only if less than 1 hour remaining
    if (days === 0 && hours === 0) {
      formattedTime += ` ${seconds}s`;
    }
    
    return formattedTime;
  };

  // Update the wallet check function
  const checkWallet = async () => {
    if (!btcAddress || !btcAddress.startsWith('bc1p')) {
      setError('Please enter a valid bc1p... address');
      setCheckResult('');
      return;
    }

    setIsChecking(true);
    setError('');
    setCheckResult('');

    try {
      // SUPER EMERGENCY FIX: eerst database volledig resetten
      console.log('⚠️ KRITIEK: Uitvoeren volledige database reset voor wallet check');
      
      try {
        const dbResetResponse = await fetch('/api/direct-db-reset?token=RareTigers2024!', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (dbResetResponse.ok) {
          console.log('KRITIEK: Complete database reset uitgevoerd');
          const resetData = await dbResetResponse.json();
          console.log('Reset response:', resetData);
        } else {
          console.error('Database reset failed with status:', dbResetResponse.status);
        }
      } catch (resetError) {
        console.error('Database reset API fout:', resetError);
      }
      
      // EMERGENCY FIX: eerst force advance check uitvoeren om de database correct te updaten
      console.log('⚠️ Forcing emergency batch-force-reset before wallet check');
      
      try {
        const resetResponse = await fetch('/api/batch-force-reset?token=RareTigers2024!', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (resetResponse.ok) {
          console.log('Emergency batch reset completed successfully');
        }
      } catch (resetError) {
        console.error('Emergency batch reset failed:', resetError);
      }
      
      // Refresh de batch info om meteen de laatste status te hebben
      try {
        const batchResponse = await fetch('/api/mint/current-batch?t=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        const batchData = await batchResponse.json();
        
        // Update direct onze lokale status
        if (batchData.currentBatch) {
          setCurrentBatch(batchData.currentBatch);
        }
        
        // Dit is kritiek - overschrijf de isSoldOut status met wat de server zegt
        if (batchData.soldOut !== undefined) {
          setIsSoldOut(batchData.soldOut);
        }
        
        console.log('Emergency batch info refresh completed:', batchData);
      } catch (batchError) {
        console.error('Emergency batch info refresh failed:', batchError);
      }
      
      // Nu pas de wallet check uitvoeren met de meest recente data
      const timestamp = Date.now();
      const response = await fetch(`/api/mint/verify?batchId=${currentBatch}&address=${encodeURIComponent(btcAddress)}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      const data = await response.json();
      console.log('Wallet check response:', data);

      // Handle the response from the new open mint system
      if (data.eligible) {
        setCheckResult(`🎉 This address is eligible to mint from Batch #${data.batchId}!\n${data.remainingMints ? `You can mint ${data.remainingMints} more Tiger(s)` : 'Ready to mint!'}`);
      } else {
        // Handle different error cases
        if (data.reason === 'invalid_address') {
          setCheckResult('❌ Invalid address format\nPlease enter a valid bc1p address');
        } else if (data.reason === 'batch_sold_out') {
          setCheckResult('⏳ Current batch is sold out\nNext batch will be available soon');
        } else if (data.reason === 'already_minted') {
          setCheckResult('✅ You already minted from this batch\nWait for the next batch to mint again');
        } else if (data.reason === 'max_tigers_reached') {
          setCheckResult('🎯 Maximum limit reached\nYou have minted the maximum number of Tigers');
        } else {
          setCheckResult('❌ Unable to verify address\nPlease try again later');
        }
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
      setError('An error occurred while checking your wallet. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pixel-grid-bg" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      {/* Navigation Bar */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '2px solid #ffd700',
        backgroundColor: 'rgba(0,0,0,0.8)'
      }}>
        <div style={{ color: '#ffd700', fontSize: '14px', textShadow: '1px 1px 0 #000' }}>
          BITCOIN TIGER
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/" style={{ color: '#ffd700', fontSize: '10px', textDecoration: 'none' }}>HOME</Link>
          {timeToMint && timeToMint > 0 ? (
            <span style={{ color: '#666', fontSize: '10px', cursor: 'not-allowed' }}>MINT</span>
          ) : (
            <Link href="/mint" style={{ color: '#ffd700', fontSize: '10px', textDecoration: 'none' }}>MINT</Link>
          )}
          <div style={{ display: 'flex', gap: '12px', marginLeft: '16px' }}>
            <Link href="https://x.com/OrdinalTigerBTC" target="_blank" rel="noopener noreferrer">
              <FaTwitter color="#ffd700" size={14} style={{ cursor: 'pointer' }} />
            </Link>
            <Link href="https://discord.gg/bitcointigercollective" target="_blank" rel="noopener noreferrer">
              <FaDiscord color="#ffd700" size={14} style={{ cursor: 'pointer' }} />
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section style={{
          position: 'relative',
          height: isMobile ? '60vh' : '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          backgroundImage: 'url(/images/tiger-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden'
        }}>
          {/* Dark overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 1
          }}></div>

          <div style={{ position: 'relative', zIndex: 2, padding: '20px' }}>
            <img 
              src="/images/tiger-logo.png"
              alt="Bitcoin Tiger Logo"
              style={{ 
                width: isMobile ? '120px' : '180px',
                height: isMobile ? '120px' : '180px',
                margin: '0 auto 20px',
                filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))'
              }}
            />
            <h1 style={{ 
              color: '#ffd700',
              fontSize: isMobile ? '24px' : '36px',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
              BITCOIN TIGER COLLECTIVE
            </h1>
            <p style={{ 
              color: '#fff',
              fontSize: isMobile ? '12px' : '14px',
              marginBottom: '30px',
              maxWidth: '600px',
              margin: '0 auto 30px'
            }}>
              Welcome to the Future of Bitcoin Gaming & Rewards
            </p>
            <div style={{ 
              maxWidth: '600px',
              margin: '0 auto 30px',
              color: '#ddd',
              fontSize: isMobile ? '10px' : '12px',
              lineHeight: '1.6'
            }}>
              Join an open community of 999 Tiger holders who earn real Bitcoin rewards through innovative gameplay and staking mechanics. Now accessible to everyone!
            </div>
            {timeToMint && timeToMint > 0 ? (
              <button
                disabled
                style={{
                  display: 'inline-block',
                  backgroundColor: '#666',
                  color: '#999',
                  padding: '15px 30px',
                  fontSize: isMobile ? '12px' : '14px',
                  border: '2px solid #444',
                  cursor: 'not-allowed'
                }}
              >
                MINT LOCKED
              </button>
            ) : (
              <Link 
                href="/mint"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#ffd700',
                  color: 'black',
                  padding: '15px 30px',
                  fontSize: isMobile ? '12px' : '14px',
                  textDecoration: 'none',
                  border: '2px solid',
                  borderTopColor: '#ffd700',
                  borderLeftColor: '#ffd700',
                  borderRightColor: '#aa8e00',
                  borderBottomColor: '#aa8e00',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                className="shine-effect"
              >
                MINT NOW
              </Link>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section style={{
          padding: isMobile ? '40px 20px' : '80px 40px',
          backgroundColor: 'rgba(0,0,0,0.9)'
        }}>
          {/* Current Batch Status */}
          <div style={{ 
            maxWidth: '800px',
            margin: '0 auto 60px',
            textAlign: 'center'
          }}>
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              border: '2px solid #ffd700',
              padding: '30px',
              borderRadius: '4px'
            }}>
              <h2 style={{ 
                color: '#ffd700',
                fontSize: isMobile ? '18px' : '24px',
                marginBottom: '20px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}>
                CURRENT MINT STATUS
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'center',
                gap: '30px',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ color: '#ffd700', fontSize: '14px', marginBottom: '5px' }}>
                    ACTIVE BATCH
                  </div>
                  <div style={{ 
                    fontSize: '24px',
                    color: '#fff',
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                  }}>
                    #{loading ? '...' : currentBatch}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#ffd700', fontSize: '14px', marginBottom: '5px' }}>
                    MINTED
                  </div>
                  <div style={{ 
                    fontSize: '24px',
                    color: '#fff',
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                  }}>
                    {loading ? '...' : `${mintedTigers}/${totalTigers}`}
                  </div>
                </div>
              </div>

              {/* Current Batch */}
              <div style={{ 
                backgroundColor: 'rgba(0,0,0,0.7)',
                border: '2px solid #ffd700',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '40px'
              }}>
                <h3 style={{ 
                  color: '#ffd700', 
                  fontSize: isMobile ? '14px' : '16px',
                  marginBottom: '15px' 
                }}>
                  CURRENT BATCH: #{currentBatch}
                </h3>
                
                {/* Display batch timer if active */}
                {batchTimerActive && batchTimerTimeLeft !== null && batchTimerTimeLeft > 0 && (
                  <div style={{
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid #ffd700',
                    padding: '10px',
                    marginBottom: '15px',
                    borderRadius: '4px'
                  }}>
                    <div style={{
                      fontSize: isMobile ? '10px' : '12px',
                      color: '#ffd700',
                      fontWeight: 'bold',
                      marginBottom: '5px'
                    }}>
                      BATCH TIMER ACTIVE
                    </div>
                    <div style={{
                      fontSize: isMobile ? '16px' : '18px',
                      color: '#ffffff',
                      fontWeight: 'bold'
                    }}>
                      {formattedBatchTimerTimeLeft}
                    </div>
                    <div style={{
                      fontSize: isMobile ? '8px' : '10px',
                      color: '#aaaaaa',
                      marginTop: '5px'
                    }}>
                      Mint before timer ends!
                    </div>
                  </div>
                )}
                
                {/* Display sold out message if batch is sold out */}
                {isSoldOut ? (
                  <div style={{
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid #ff0000',
                    padding: '10px',
                    marginBottom: '15px',
                    borderRadius: '4px'
                  }}>
                    <div style={{
                      fontSize: isMobile ? '10px' : '12px',
                      color: '#ff0000',
                      fontWeight: 'bold',
                      marginBottom: '5px'
                    }}>
                      BATCH #{currentBatch} SOLD OUT
                    </div>
                    <div style={{
                      fontSize: isMobile ? '8px' : '10px',
                      color: '#aaaaaa'
                    }}>
                      Next batch in: {formattedTimeLeft}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    border: '1px solid #00ff00',
                    padding: '10px',
                    marginBottom: '15px',
                    borderRadius: '4px'
                  }}>
                    <div style={{
                      fontSize: isMobile ? '10px' : '12px',
                      color: '#00ff00',
                      fontWeight: 'bold'
                    }}>
                      BATCH #{currentBatch} AVAILABLE
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{ 
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto 20px'
              }}>
                <div style={{ 
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#222',
                  border: '1px solid #333',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${progressPercentage}%`,
                    height: '100%',
                    backgroundColor: isSoldOut ? '#ff0000' : '#ffd700',
                    transition: 'width 0.5s ease-in-out, background-color 0.3s ease'
                  }}></div>
                </div>
              </div>

              {/* Mint Button - Hidden when sold out */}
              {!isSoldOut && (
                <div style={{ textAlign: 'center' }}>
                  {timeToMint && timeToMint > 0 ? (
                    <div>
                      <div style={{
                        color: '#ffd700',
                        fontSize: '14px',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', monospace"
                      }}>
                        MINT STARTS IN
                      </div>
                      <div style={{
                        fontSize: '24px',
                        color: '#fff',
                        marginBottom: '20px',
                        fontFamily: "'Press Start 2P', monospace"
                      }}>
                        {formatTimeLeft(timeToMint)}
                      </div>
                      <button
                        disabled
                        style={{
                          backgroundColor: '#666',
                          color: '#999',
                          padding: '12px 24px',
                          fontSize: '12px',
                          fontFamily: "'Press Start 2P', monospace",
                          border: '2px solid #444',
                          cursor: 'not-allowed'
                        }}
                      >
                        MINT LOCKED
                      </button>
                    </div>
                  ) : (
                    <Link 
                      href="/mint"
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#ffd700',
                        color: 'black',
                        padding: '12px 24px',
                        fontSize: '12px',
                        textDecoration: 'none',
                        border: '2px solid',
                        borderTopColor: '#ffd700',
                        borderLeftColor: '#ffd700',
                        borderRightColor: '#aa8e00',
                        borderBottomColor: '#aa8e00',
                        transition: 'transform 0.2s',
                        cursor: 'pointer',
                        marginBottom: '20px'
                      }}
                      className="shine-effect"
                    >
                      MINT FROM BATCH #{loading ? '...' : currentBatch}
                    </Link>
                  )}
                </div>
              )}

              {/* Wallet Checker */}
              <div style={{ 
                borderTop: '1px solid #333',
                paddingTop: '20px',
                marginTop: '20px'
              }}>
                <div style={{ 
                  color: '#ffd700', 
                  fontSize: '14px', 
                  marginBottom: '10px'
                }}>
                  CHECK YOUR WALLET ELIGIBILITY
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#aaa', 
                  marginBottom: '10px',
                  textAlign: 'center'
                }}>
                  Open to everyone! Enter any valid bc1p address to mint
                </div>
                <div style={{ 
                  display: 'flex',
                  gap: '10px',
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  <input 
                    type="text"
                    placeholder="Enter your bc1p... address"
                    value={btcAddress}
                    onChange={(e) => setBtcAddress(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: 'black',
                      border: '1px solid #ffd700',
                      color: 'white',
                      fontSize: '10px'
                    }}
                  />
                  <button
                    onClick={checkWallet}
                    disabled={isChecking}
                    style={{ 
                      backgroundColor: '#ffd700',
                      color: 'black',
                      padding: '0 15px',
                      border: '2px solid',
                      borderTopColor: '#ffd700',
                      borderLeftColor: '#ffd700',
                      borderRightColor: '#aa8e00',
                      borderBottomColor: '#aa8e00',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isChecking ? 0.7 : 1
                    }}
                  >
                    {isChecking ? 'CHECKING...' : 'CHECK'}
                  </button>
                </div>

                {error && (
                  <div style={{ 
                    color: '#ef4444',
                    fontSize: '10px',
                    padding: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    maxWidth: '500px',
                    margin: '10px auto 0'
                  }}>
                    {error}
                  </div>
                )}

                {checkResult && (
                  <div style={{ 
                    fontSize: '12px',
                    padding: '12px',
                    backgroundColor: checkResult.includes('🎉') || checkResult.includes('eligible') || checkResult.includes('already minted') ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${checkResult.includes('🎉') || checkResult.includes('eligible') || checkResult.includes('already minted') ? '#4ade80' : '#ef4444'}`,
                    color: checkResult.includes('🎉') || checkResult.includes('eligible') || checkResult.includes('already minted') ? '#4ade80' : '#ef4444',
                    maxWidth: '500px',
                    margin: '10px auto 0',
                    whiteSpace: 'pre-line'
                  }}>
                    {checkResult}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '30px'
          }}>
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.7)',
              border: '2px solid #ffd700',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#ffd700', fontSize: isMobile ? '14px' : '16px', marginBottom: '10px' }}>
                STAKE & EARN
              </div>
              <p style={{ fontSize: '10px', color: '#ddd' }}>
                Stake your Tiger for 7 days and unlock mysterious treasure chests filled with real Bitcoin rewards
              </p>
            </div>

            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.7)',
              border: '2px solid #ffd700',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#ffd700', fontSize: isMobile ? '14px' : '16px', marginBottom: '10px' }}>
                LEVEL & EVOLVE
              </div>
              <p style={{ fontSize: '10px', color: '#ddd' }}>
                Power up your Tiger with BTC to unlock higher tiers and multiply your treasure chest rewards
              </p>
            </div>

            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.7)',
              border: '2px solid #ffd700',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#ffd700', fontSize: isMobile ? '14px' : '16px', marginBottom: '10px' }}>
                EXCLUSIVE COLLECTION
              </div>
              <p style={{ fontSize: '10px', color: '#ddd' }}>
                Be one of only 999 Tigers in our collective, each with the power to generate real Bitcoin rewards
              </p>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section style={{
          padding: isMobile ? '40px 20px' : '80px 40px',
          backgroundColor: 'rgba(0,0,0,0.8)'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ 
              color: '#ffd700', 
              fontSize: isMobile ? '18px' : '24px',
              marginBottom: '30px'
            }}>
              ABOUT THE COLLECTIVE
            </h2>
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.7)',
              border: '2px solid #ffd700',
              padding: '30px',
              fontSize: isMobile ? '10px' : '12px',
              lineHeight: '1.6',
              color: '#ddd'
            }}>
              <p style={{ marginBottom: '20px' }}>
                Welcome to the Bitcoin Tiger Collective - where gaming meets Bitcoin rewards. Our collection of 999 Tiger Ordinals combines unique digital art with real financial utility on the Bitcoin blockchain.
              </p>
              <p style={{ marginBottom: '20px' }}>
                Every Tiger in our collective is more than just art - it's your key to earning real Bitcoin rewards. Through our innovative staking system, your Tiger works for you, generating Bitcoin treasures while you hold.
              </p>
              <p style={{ marginBottom: '20px' }}>
                <strong>Now Open to Everyone!</strong> We've made Bitcoin Tigers accessible to all Bitcoin enthusiasts. No more exclusive whitelist - simply have a valid bc1p address and you can join the collective.
              </p>
              <p style={{ marginBottom: '20px' }}>
                Ready to maximize your rewards? Here's how it works:
              </p>
              <ul style={{ 
                textAlign: 'left', 
                listStyle: 'none',
                marginBottom: '20px'
              }}>
                <li style={{ marginBottom: '10px' }}>• Mint your Tiger with any valid bc1p Bitcoin address</li>
                <li style={{ marginBottom: '10px' }}>• Stake your Tiger for 7 days to earn mysterious Bitcoin treasure chests</li>
                <li style={{ marginBottom: '10px' }}>• Level up your Tiger using BTC to unlock higher reward tiers</li>
                <li style={{ marginBottom: '10px' }}>• Earn multiple treasure chests per stake at higher levels</li>
                <li style={{ marginBottom: '10px' }}>• All rewards are paid in real Bitcoin - automatically and securely</li>
              </ul>
              <p style={{ marginBottom: '20px' }}>
                The more you engage, the more you earn. Level up your Tiger to receive multiple treasure chests every 7 days, increasing your Bitcoin rewards exponentially.
              </p>
              <p>
                Don't miss your chance to be part of this revolutionary Bitcoin gaming experience. Join the Bitcoin Tiger Collective today and start earning real Bitcoin rewards!
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          padding: '20px',
          backgroundColor: 'rgba(0,0,0,0.9)',
          borderTop: '2px solid #ffd700',
          textAlign: 'center'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '20px',
            marginBottom: '20px'
          }}>
            <Link href="https://x.com/OrdinalTigerBTC" target="_blank" rel="noopener noreferrer">
              <FaTwitter color="#ffd700" size={20} style={{ cursor: 'pointer' }} />
            </Link>
            <Link href="https://discord.gg/bitcointigercollective" target="_blank" rel="noopener noreferrer">
              <FaDiscord color="#ffd700" size={20} style={{ cursor: 'pointer' }} />
            </Link>
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            © 2025 Bitcoin Tiger Collective. All rights reserved.
          </div>
        </footer>
      </main>

      {/* CSS Animations */}
      <style jsx global>{`
        .shine-effect {
          position: relative;
          overflow: hidden;
        }
        
        .shine-effect:hover {
          transform: translateY(-2px);
        }
        
        .shine-effect::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent,
            transparent 40%,
            rgba(255, 215, 0, 0.1) 50%,
            transparent 60%,
            transparent
          );
          transform: rotate(45deg);
          animation: shine 3s infinite;
        }
        
        @keyframes shine {
          0% {
            left: -50%;
            top: -50%;
          }
          100% {
            left: 100%;
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
} 