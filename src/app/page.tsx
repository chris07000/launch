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

  // Effect for fetching current batch
  useEffect(() => {
    const fetchBatchInfo = async () => {
      try {
        setLoading(true);
        // Get current batch status
        const response = await fetch('/api/mint/current-batch');
        const data = await response.json();

        console.log('Current batch data:', data);
        
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

        const mintedTigersCount = data.mintedTigers || 0;
        const totalTigersCount = data.totalTigers || 66;
        setMintedTigers(mintedTigersCount);
        setTotalTigers(totalTigersCount);
      } catch (error) {
        console.error('Error fetching current batch:', error);
      } finally {
        setLoading(false);
      }
    };

    let timerInterval: NodeJS.Timeout;
    let checkCooldownInterval: NodeJS.Timeout;

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

    // Add function to check cooldown and advance batch if needed
    const checkCooldownAndAdvance = async () => {
      try {
        console.log("Checking cooldown and advance batch status...");
        const response = await fetch('/api/check-cooldown-and-advance');
        const data = await response.json();
        
        console.log("Cooldown check response:", data);
        
        // If the batch was advanced, refresh the batch info
        if (data.status === 'advanced') {
          console.log(`Batch advanced from ${data.previousBatch} to ${data.newBatch}`);
          // Re-fetch batch info instead of calling fetchBatchInfo
          fetchBatchInfo();
        } else if (data.status === 'cooldown') {
          console.log(`Batch ${data.batch} in cooldown. ${Math.ceil(data.timeLeft / 1000 / 60)} minutes left`);
        }
      } catch (error) {
        console.error('Error checking cooldown and advance:', error);
      }
    };

    // Initial checks
    fetchBatchInfo();
    checkMintStartTime();
    checkCooldownAndAdvance();
    
    // Set up intervals
    const batchInterval = setInterval(fetchBatchInfo, 30000);
    const countdownInterval = setInterval(() => {
      if (isSoldOut && timeLeft > 0) {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }
    }, 1000);
    checkCooldownInterval = setInterval(checkCooldownAndAdvance, 15000);

    // Cleanup function
    return () => {
      clearInterval(batchInterval);
      clearInterval(countdownInterval);
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      if (checkCooldownInterval) {
        clearInterval(checkCooldownInterval);
      }
    };
  }, [isSoldOut, timeLeft]); // Dependencies updated

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
      formattedTime += `${hours}u `;
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
      const data = await fetchApi(`/api/mint/verify?batchId=${currentBatch}&address=${encodeURIComponent(btcAddress)}`);

      if (data.eligible) {
        setCheckResult(`🎉 This address is whitelisted for Batch #${currentBatch}`);
      } else if (data.whitelistedBatch) {
        setCheckResult(`🎉 This address is whitelisted for Batch #${data.whitelistedBatch}`);
      } else {
        setCheckResult(`🐯 This address is not whitelisted\nYou are not bullish enough`);
      }
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      setError(errorMessage);
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
              Join an elite community of 999 Tiger holders who earn real Bitcoin rewards through innovative gameplay and staking mechanics
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

              {/* Sold Out Status */}
              {isSoldOut && (
                <div className="sold-out-container" style={{
                  marginBottom: '20px',
                  padding: '15px',
                  background: 'linear-gradient(to right, #000000, #111111)',
                  border: 'none',
                  borderLeft: '4px solid #ffd700',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Gold accent at top */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: 'linear-gradient(to right, transparent, #ffd700, transparent)'
                  }}></div>
                  
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    letterSpacing: '2px',
                    color: '#ffd700'
                  }}>
                    BATCH {currentBatch} SOLD OUT
                  </div>
                  
                  <div style={{ 
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ opacity: 0.7 }}>Next batch opens in:</span> 
                    <span style={{ 
                      fontFamily: 'monospace', 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      letterSpacing: '1px'
                    }}>
                      {formatTimeLeft(timeLeft * 1000)}
                    </span>
                  </div>
                  
                  {/* Gold accent at bottom */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: 'linear-gradient(to right, transparent, #ffd700, transparent)'
                  }}></div>
                </div>
              )}

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
                    width: `${loading ? 0 : (mintedTigers / totalTigers) * 100}%`,
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
                  CHECK YOUR WALLET STATUS
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
                    backgroundColor: checkResult.includes('🎉') ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${checkResult.includes('🎉') ? '#4ade80' : '#ef4444'}`,
                    color: checkResult.includes('🎉') ? '#4ade80' : '#ef4444',
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
                Welcome to the Bitcoin Tiger Collective - where gaming meets Bitcoin rewards. Our exclusive collection of 999 Tiger Ordinals combines unique digital art with real financial utility on the Bitcoin blockchain.
              </p>
              <p style={{ marginBottom: '20px' }}>
                Every Tiger in our collective is more than just art - it's your key to earning real Bitcoin rewards. Through our innovative staking system, your Tiger works for you, generating Bitcoin treasures while you hold.
              </p>
              <p style={{ marginBottom: '20px' }}>
                Ready to maximize your rewards? Here's how it works:
              </p>
              <ul style={{ 
                textAlign: 'left', 
                listStyle: 'none',
                marginBottom: '20px'
              }}>
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