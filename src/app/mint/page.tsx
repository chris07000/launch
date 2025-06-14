'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaBitcoin, FaLock, FaTwitter, FaDiscord } from 'react-icons/fa';
import Link from 'next/link';

// Importeer de directe patch
import { patchVerifyEndpoint } from './direct-patch';

// Add interface for Batch type
interface Batch {
  id: number;
  price: number;
  mintedWallets: number;
  maxWallets: number;
  ordinals: number;
  isSoldOut: boolean;
  mintedTigers?: number;
}

export default function Home() {
  // Patch de verify endpoint bij het laden
  useEffect(() => {
    try {
      patchVerifyEndpoint();
    } catch (error) {
      console.error("Could not patch verify endpoint:", error);
    }
  }, []);

  const [quantity, setQuantity] = useState(1);
  const [btcAddress, setBtcAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [canMint, setCanMint] = useState(false);
  const [batchNumber, setBatchNumber] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  
  // Nieuwe states voor de batch informatie
  const [batches, setBatches] = useState<Batch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(0);

  // Timer state toevoegen
  const [soldOutTimer, setSoldOutTimer] = useState<number | null>(null);

  // Voeg deze state toe aan het begin van de component
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [soldOutTime, setSoldOutTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  // Nieuwe state voor stabiele display
  const [formattedTimeLeft, setFormattedTimeLeft] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [cachedMintedTigers, setCachedMintedTigers] = useState<number>(0);
  const [cachedTotalTigers, setCachedTotalTigers] = useState<number>(66);

  // Add this near the top with other state declarations
  const [lastBatchUpdate, setLastBatchUpdate] = useState<number>(0);

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

  // Aparte effect voor time formatting zodat dit niet flikkert bij andere updates
  useEffect(() => {
    // Format time and update every second
    const updateFormattedTime = () => {
      if (isSoldOut && timeLeft > 0) {
        setFormattedTimeLeft(formatTimeLeft(timeLeft * 1000));
      } else {
        setFormattedTimeLeft('0m 0s');
      }
    };
    
    // Update initially
    updateFormattedTime();
    
    // Set interval to update every second
    const formattingInterval = setInterval(updateFormattedTime, 1000);
    
    // Clean up
    return () => clearInterval(formattingInterval);
  }, [timeLeft, isSoldOut]);

  // Aparte timer voor aftellen zonder pagina-refresh
  useEffect(() => {
    if (isSoldOut && timeLeft > 0) {
      const timerInterval = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(timerInterval);
    }
  }, [isSoldOut]);

  // Effect voor controle of timer bijna op 0 staat
  useEffect(() => {
    if (isSoldOut && timeLeft <= 1) {
      console.log("Mint page - Timer nearly zero, forcing priority cooldown check...");
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

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch batches
        const batchesResponse = await fetch('/api/mint');
        const batchesData = await batchesResponse.json();
        
        if (batchesData.batches) {
          setBatches(batchesData.batches);
        }
        
        // Fetch current batch status
        const response = await fetch('/api/mint/current-batch');
        const data = await response.json();
        
        // Store the current batch and batches data
        if (data.currentBatch && data.currentBatch !== currentBatch) {
          console.log(`Batch changed from ${currentBatch} to ${data.currentBatch}`);
          setCurrentBatch(data.currentBatch);
          
          // Reset verification when batch changes
          if (canMint && batchNumber !== data.currentBatch) {
            setCanMint(false);
            setBatchNumber(0);
          }
        }
        
        setIsSoldOut(data.soldOut);
        
        // Update tiger counts and progress percentage
        if (data.mintedTigers !== undefined && data.totalTigers !== undefined) {
          // Alleen updaten bij echte veranderingen
          if (data.mintedTigers !== cachedMintedTigers || data.totalTigers !== cachedTotalTigers) {
            setCachedMintedTigers(data.mintedTigers);
            setCachedTotalTigers(data.totalTigers);
            setProgressPercentage(Math.min(100, Math.round((data.mintedTigers / data.totalTigers) * 100)));
          }
        }
        
        // For sold out batches, handle cooldown timer
        if (data.soldOut && data.timeLeft) {
          setTimeLeft(Math.floor(data.timeLeft / 1000));
        } else if (!data.soldOut) {
          setIsSoldOut(false);
          setSoldOutTime(null);
          setTimeLeft(0);
        }
      } catch (error) {
        console.error('Error fetching batch info:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Function to check batch status - maar let op: dit is de eerste stap voor de refactor
    const checkBatchStatus = async () => {
      try {
        // Check current batch status
        const currentBatchResponse = await fetch('/api/mint/current-batch');
        const currentBatchData = await currentBatchResponse.json();
        
        // Update current batch
        if (currentBatchData.currentBatch) {
          setCurrentBatch(currentBatchData.currentBatch);
        }
        
        if (currentBatchData.soldOutAt) {
          // Gebruik de timeLeft en cooldownDuration uit API
          if (currentBatchData.timeLeft) {
            setIsSoldOut(true);
            setSoldOutTime(currentBatchData.soldOutAt);
            setTimeLeft(Math.floor(currentBatchData.timeLeft / 1000)); // Convert ms to seconds
          } else {
            const now = Date.now();
            // Gebruik cooldownDuration uit API of default naar 15 minuten als fallback
            const cooldownDuration = currentBatchData.cooldownDuration || (15 * 60 * 1000);
            const timeSinceSoldOut = now - currentBatchData.soldOutAt;
            const timeLeftMs = Math.max(0, cooldownDuration - timeSinceSoldOut);
            
            if (timeLeftMs > 0) {
              setIsSoldOut(true);
              setSoldOutTime(currentBatchData.soldOutAt);
              setTimeLeft(Math.floor(timeLeftMs / 1000));
            } else {
              // If display period is over, clear sold out status
              setIsSoldOut(false);
              setSoldOutTime(null);
              setTimeLeft(0);
              
              // Fetch new batch info instead of refreshing the page
              fetchData();
            }
          }
        } else {
          setIsSoldOut(false);
          setSoldOutTime(null);
          setTimeLeft(0);
        }
      } catch (error) {
        console.error('Error checking batch status:', error);
      }
    };
    
    fetchData();
    
    // Set up intervals - ALLEEN periodieke checks, geen afhankelijkheid van state
    const statusIntervalId = setInterval(checkBatchStatus, 30000);
    
    const cooldownIntervalId = setInterval(() => {
      // Check cooldown status periodically
      fetch('/api/check-cooldown-and-advance', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }).then(response => response.json())
        .then(data => {
          if (data.status === 'advanced') {
            console.log(`Mint page - Batch advanced from ${data.previousBatch} to ${data.newBatch}`);
            
            // Reset the verification state when the batch changes
            if (canMint && batchNumber !== data.newBatch) {
              setCanMint(false);
              setBatchNumber(0);
              setError('Batch has changed. Please verify your address again.');
            }
            
            // Refresh data completely
            fetchData();
          }
        })
        .catch(error => {
          console.error('Error checking cooldown and advance:', error);
        });
    }, 15000);
    
    return () => {
      clearInterval(statusIntervalId);
      clearInterval(cooldownIntervalId);
    };
  }, [canMint, batchNumber]); // Minimale dependencies, alleen wat echt moet veranderen

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

  // Effect voor de sold out timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Find the current batch
    const currentBatchData = batches.find(b => b.id === currentBatch);
    
    if (currentBatch && currentBatchData?.isSoldOut) {
      // Start een timer die elke seconde aftelt
      interval = setInterval(() => {
        const soldOutTime = localStorage.getItem(`batch_${currentBatch}_soldout_time`);
        if (soldOutTime) {
          const timeLeft = 15 * 60 - (Math.floor((Date.now() - parseInt(soldOutTime)) / 1000));
          if (timeLeft > 0) {
            setSoldOutTimer(timeLeft);
          } else {
            setSoldOutTimer(null);
            clearInterval(interval);
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentBatch, batches]);

  // In-memory batches fallback for when API is not available
  const batchesFallback: Batch[] = [
    { id: 1, price: 250.00, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 2, price: 260.71, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 3, price: 271.43, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 4, price: 282.14, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 5, price: 292.86, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 6, price: 303.57, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 7, price: 314.29, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 8, price: 325.00, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 9, price: 335.71, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 10, price: 346.43, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 11, price: 357.14, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 12, price: 367.86, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 13, price: 378.57, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 14, price: 389.29, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
    { id: 15, price: 400.00, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false }
  ];

  // Update price calculation with null check and type safety
  const price = loading || !Array.isArray(batches)
    ? batchesFallback.find(b => b.id === currentBatch)?.price || 250.00
    : batches.find(b => b.id === currentBatch)?.price || 250.00;

  // Max aantal Tigers per wallet
  const maxTigersPerWallet = parseInt(process.env.MAX_TIGERS_PER_WALLET || '2', 10);
  
  // Add BTC price conversion helper
  const usdToBtc = (usdAmount: number | undefined): string => {
    if (typeof usdAmount !== 'number') {
      return '0.00000000'; // Return a valid string if not a number
    }
    const btcPrice = 103000; // Current BTC price in USD
    return (usdAmount / btcPrice).toFixed(8); // Show 8 decimal places for BTC
  };

  const verifyAddress = async () => {
    if (!btcAddress || !btcAddress.startsWith('bc1p')) {
      setError('Please enter a valid bc1p address');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Call the API to verify if this address is eligible to mint
      const response = await fetch(`/api/mint/verify?batchId=${currentBatch}&address=${encodeURIComponent(btcAddress)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify address');
      }
      
      const verificationData = await response.json();
      
      if (!verificationData.eligible) {
        if (verificationData.reason === 'invalid_address') {
          setError('Please enter a valid bc1p address');
        } else if (verificationData.reason === 'already_minted') {
          setError(`This address has already minted from batch ${currentBatch}`);
        } else if (verificationData.reason === 'batch_sold_out') {
          setError(`Batch ${currentBatch} is sold out`);
        } else if (verificationData.reason === 'max_tigers_reached') {
          setError(`This address has reached the maximum limit of Tigers`);
        } else {
          setError(`Address verification failed: ${verificationData.message || verificationData.reason}`);
        }
        return;
      }
      
      // Address is eligible to mint
      setCanMint(true);
      setBatchNumber(currentBatch);
      
      // Show success message with remaining mints info
      if (verificationData.remainingMints) {
        console.log(`Address verified successfully. Can mint ${verificationData.remainingMints} more Tiger(s).`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify address');
    } finally {
      setIsLoading(false);
    }
  };

  const incrementQuantity = () => {
    if (quantity < maxTigersPerWallet) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canMint) {
      setError('Address verification required before minting');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Call the API to create a mint order
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          btcAddress,
          quantity,
          batchId: currentBatch
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create mint order');
      }
      
      const data = await response.json();
      
      // Redirect to payment page
      router.push(`/payment/${data.orderId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create mint order');
    } finally {
      setIsLoading(false);
    }
  };

  const [timeToMint, setTimeToMint] = useState<number | null>(null);

  // Check mint timer immediately
  useEffect(() => {
    const checkMintStartTime = async () => {
      try {
        const response = await fetch('/api/mint-start');
        const data = await response.json();
        
        if (data.startTime && data.startTime > 0) {
          const now = Date.now();
          const timeLeft = data.startTime - now;
          
          if (timeLeft > 0) {
            // Redirect immediately if timer is still running
            router.replace('/');
            return;
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking mint start time:', error);
        setIsLoading(false);
      }
    };

    checkMintStartTime();
  }, [router]);

  // Show nothing while checking timer
  if (isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black',
        color: '#ffd700'
      }}>
        Loading...
      </div>
    );
  }

  // Update convertCurrentBatchData function to use cached values for stability
  function convertCurrentBatchData() {
    if (cachedMintedTigers !== undefined && cachedTotalTigers !== undefined) {
      return `${cachedMintedTigers} / ${cachedTotalTigers} Tigers`;
    }
    
    const currentBatchData = batches.find(b => b.id === currentBatch);
    if (!currentBatchData) return "0 / 0";
    
    // Log voor debug
    console.log(`Weergave data batch ${currentBatch}:`, {
      mintedTigers: currentBatchData.mintedTigers,
      mintedWallets: currentBatchData.mintedWallets,
      ordinals: currentBatchData.ordinals
    });
    
    const mintedCount = currentBatchData.mintedTigers !== undefined 
      ? currentBatchData.mintedTigers 
      : (currentBatchData.mintedWallets || 0) * 2;
    const totalCount = currentBatchData.ordinals || 66;
    
    return `${mintedCount} / ${totalCount} Tigers`;
  }

  return (
    <div className="min-h-screen bg-black text-white pixel-grid-bg" style={{ fontFamily: "'Press Start 2P', monospace" }}>
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
          <Link href="/mint" style={{ color: '#ffd700', fontSize: '10px', textDecoration: 'none' }}>MINT</Link>
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
      <main className="responsive-container" style={{ 
        maxWidth: isMobile ? '500px' : '1000px', 
        margin: '0 auto', 
        padding: '24px 16px' 
      }}>
        {/* Collection Title */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '15px',
            marginBottom: '10px'
          }}>
            <img 
              src="/images/tiger-logo.png"
              alt="Tiger Logo"
              style={{ 
                width: '50px', 
                height: '50px', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.7))'
              }}
            />
            <h1 style={{ 
              color: '#ffd700', 
              fontSize: 'clamp(18px, 5vw, 24px)', 
              textShadow: '2px 2px 0 #000'
            }}>
              BITCOIN TIGER COLLECTIVE
            </h1>
            <img 
              src="/images/tiger-logo.png"
              alt="Tiger Logo"
              style={{ 
                width: '50px', 
                height: '50px', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.7))'
              }}
            />
          </div>
          <p style={{ color: '#aaa', fontSize: 'clamp(10px, 3vw, 12px)' }}>
            Exclusive Bitcoin Ordinals Collection
          </p>
        </div>
        
        {/* Desktop: 2-column layout, Mobile: 1-column */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '24px' : '20px'
        }}>
          {/* Left Column */}
          <div style={{ flex: isMobile ? '1' : '0 0 40%' }}>
            {/* Preview image */}
            <div style={{ 
              backgroundColor: 'black', 
              border: '3px solid',
              borderTopColor: '#ffd700',
              borderLeftColor: '#ffd700',
              borderRightColor: '#aa8e00',
              borderBottomColor: '#aa8e00',
              padding: '10px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <div className="tiger-logo-container" style={{ 
                width: '200px', 
                height: '200px', 
                backgroundColor: '#111', 
                margin: '0 auto', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #333',
                overflow: 'hidden'
              }}>
                {/* Tiger logo gewijzigd naar tigercollection */}
                <div style={{
                  width: '180px',
                  height: '180px',
                  position: 'relative'
                }}>
                  <img 
                    src="/images/tigercollection.png" 
                    alt="Bitcoin Tiger Collection" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
                <div style={{ 
                  marginTop: '5px', 
                  fontSize: '10px', 
                  color: '#ffd700',
                  textShadow: '1px 1px 1px rgba(0,0,0,0.8)'
                }}>
                  BATCH #{currentBatch}
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '9px', color: '#aaa' }}>
                Preview - Actual Ordinal may vary
              </div>
            </div>
            
            {/* Current Batch Info */}
            <div className="responsive-margin" style={{ 
              backgroundColor: 'rgba(0,0,0,0.7)', 
              border: '3px solid',
              borderTopColor: '#ffd700',
              borderLeftColor: '#ffd700',
              borderRightColor: '#aa8e00',
              borderBottomColor: '#aa8e00',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', fontSize: '14px', marginBottom: '10px' }}>
                CURRENT BATCH: #{currentBatch}
              </div>
              
              {/* Display sold out message if batch is sold out */}
              {isSoldOut && (
                <div className="sold-out-container" style={{
                  width: '100%',
                  marginBottom: '20px',
                  padding: '10px',
                  backgroundColor: '#111',
                  border: '1px solid #ffd700',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '4px',
                  position: 'relative'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    letterSpacing: '1px',
                    color: '#ffd700',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}>
                    Batch #{currentBatch} Sold Out
                  </div>
                  
                  <div style={{ 
                    fontSize: '11px',
                    color: '#ffffff',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    <span>Next batch opens in:</span> 
                    <span style={{ 
                      fontWeight: 'bold',
                      color: '#ffd700'
                    }}>
                      {formattedTimeLeft}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: '#aaa' }}>PRICE:</div>
                <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center' }}>
                  <FaBitcoin style={{ color: '#f7931a', marginRight: '4px', fontSize: '8px' }} />
                  {usdToBtc(typeof price === 'number' ? price : 0)} BTC
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: '#aaa' }}>MAX PER WALLET:</div>
                <div style={{ fontSize: '10px' }}>{maxTigersPerWallet}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: '#aaa' }}>ELIGIBILITY:</div>
                <div style={{ fontSize: '10px' }}>Open to everyone with a bc1p address</div>
              </div>
              
              {/* Progress Bar */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>MINTED:</div>
                  <div style={{ fontSize: '10px' }}>
                    {loading ? '...' : convertCurrentBatchData()}
                  </div>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '6px', 
                  backgroundColor: '#222',
                  border: '1px solid #333',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${progressPercentage}%`, 
                    height: '100%', 
                    backgroundColor: '#ffd700',
                    transition: 'width 0.5s ease-in-out'
                  }}></div>
                </div>
              </div>
            </div>
            
            {/* Batch Information */}
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              border: '2px solid',
              borderTopColor: '#ffd700',
              borderLeftColor: '#ffd700',
              borderRightColor: '#aa8e00',
              borderBottomColor: '#aa8e00',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '8px', fontSize: '12px' }}>BATCH PRICES</div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '9px'
              }}>
                {(loading || !Array.isArray(batches) ? batchesFallback : batches).map(batch => (
                  <div 
                    key={batch.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      backgroundColor: batch.id === currentBatch ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                      border: batch.id === currentBatch ? '1px solid #ffd700' : '1px solid #333'
                    }}
                  >
                    <span>Batch #{batch.id}{batch.id === 16 ? ' (FCFS)' : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <FaBitcoin style={{ color: '#f7931a', marginRight: '2px', fontSize: '8px' }} />
                      {usdToBtc(typeof batch.price === 'number' ? batch.price : 0)} BTC
                    </span>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '12px', fontSize: '9px', color: '#aaa', lineHeight: '1.4' }}>
                • Each batch has 66 ordinals
                <br />
                • Total supply: 999 Bitcoin Tigers
                <br />
                • Open to everyone with a bc1p address
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div style={{ flex: isMobile ? '1' : '0 0 60%' }}>
            {/* Mint Container */}
            <div className="responsive-padding" style={{ 
              backgroundColor: 'rgba(0,0,0,0.7)', 
              border: '3px solid',
              borderTopColor: '#ffd700',
              borderLeftColor: '#ffd700',
              borderRightColor: '#aa8e00',
              borderBottomColor: '#aa8e00',
              padding: '20px',
              marginBottom: '24px'
            }}>
              {/* TITLE */}
              <div style={{ 
                marginBottom: '20px',
                textAlign: 'center',
                borderBottom: '2px solid #ffd700',
                paddingBottom: '10px'
              }}>
                <div style={{ color: '#ffd700', textShadow: '2px 2px 0 #000', fontSize: '18px', letterSpacing: '1px' }}>MINT YOUR TIGER</div>
              </div>
              
              {/* ADDRESS INPUT */}
              <div className="responsive-margin" style={{ marginBottom: '16px' }}>
                <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '6px', fontSize: '12px' }}>YOUR BTC ADDRESS (TAPROOT):</div>
                <div style={{ 
                  backgroundColor: 'black', 
                  border: '2px solid',
                  borderTopColor: '#ffd700',
                  borderLeftColor: '#ffd700',
                  borderRightColor: '#aa8e00',
                  borderBottomColor: '#aa8e00',
                  padding: '8px'
                }}>
                  <input 
                    type="text" 
                    placeholder="Enter your bc1p... Taproot address for Ordinals"
                    value={btcAddress}
                    onChange={(e) => setBtcAddress(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #333',
                      padding: '8px',
                      color: 'white',
                      width: '100%',
                      fontSize: '11px',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '8px' }}>
                    Must start with bc1p (Taproot address) to receive Ordinals
                  </div>
                  {/* VERIFICATION BUTTON */}
                  <button 
                    onClick={verifyAddress}
                    disabled={isSoldOut}
                    className="pixel-button"
                    style={{ 
                      marginTop: '8px',
                      backgroundColor: isSoldOut ? '#333' : '#ffd700', 
                      color: isSoldOut ? '#666' : 'black', 
                      padding: '6px 8px',
                      border: '2px solid',
                      borderTopColor: isSoldOut ? '#444' : '#ffd700',
                      borderLeftColor: isSoldOut ? '#444' : '#ffd700',
                      borderRightColor: isSoldOut ? '#222' : '#aa8e00',
                      borderBottomColor: isSoldOut ? '#222' : '#aa8e00',
                      width: '100%',
                      fontSize: '10px',
                      cursor: isSoldOut ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSoldOut ? 'BATCH SOLD OUT' : 'VERIFY ADDRESS'}
                  </button>

                  {/* ERROR MESSAGE */}
                  {error && (
                    <div style={{ 
                      marginTop: '8px', 
                      color: '#ef4444', 
                      padding: '8px',
                      border: '1px solid #7f1d1d',
                      backgroundColor: 'black',
                      fontSize: '10px'
                    }}>
                      {error}
                    </div>
                  )}
                  
                  {canMint && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '6px', 
                      backgroundColor: 'rgba(74, 222, 128, 0.1)', 
                      border: '1px solid #4ade80',
                      color: '#4ade80',
                      fontSize: '9px',
                      textAlign: 'center'
                    }}>
                      ADDRESS VERIFIED - Eligible for Batch #{batchNumber}
                    </div>
                  )}
                </div>
              </div>
              
              {/* QUANTITY ROW */}
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                gap: '16px',
                marginBottom: '16px' 
              }}>
                {/* QUANTITY */}
                <div style={{ flex: '1' }}>
                  <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '6px', fontSize: '12px' }}>SELECT QUANTITY</div>
                  <div style={{ 
                    backgroundColor: 'black', 
                    border: '2px solid',
                    borderTopColor: '#ffd700',
                    borderLeftColor: '#ffd700',
                    borderRightColor: '#aa8e00',
                    borderBottomColor: '#aa8e00',
                    padding: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button 
                        onClick={decrementQuantity} 
                        disabled={quantity <= 1}
                        className="pixel-button"
                        style={{ 
                          backgroundColor: '#ffd700', 
                          color: 'black', 
                          width: '28px', 
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          border: '2px solid',
                          borderTopColor: '#ffd700',
                          borderLeftColor: '#ffd700',
                          borderRightColor: '#aa8e00',
                          borderBottomColor: '#aa8e00',
                          opacity: quantity <= 1 ? 0.5 : 1,
                          cursor: 'pointer'
                        }}
                      >
                        -
                      </button>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        border: '1px solid #ffd700', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 6px',
                        backgroundColor: 'black',
                        fontSize: '14px'
                      }}>
                        {quantity}
                      </div>
                      <button 
                        onClick={incrementQuantity}
                        disabled={quantity >= maxTigersPerWallet}
                        className="pixel-button"
                        style={{ 
                          backgroundColor: '#ffd700', 
                          color: 'black', 
                          width: '28px', 
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          border: '2px solid',
                          borderTopColor: '#ffd700',
                          borderLeftColor: '#ffd700',
                          borderRightColor: '#aa8e00',
                          borderBottomColor: '#aa8e00',
                          opacity: quantity >= maxTigersPerWallet ? 0.5 : 1,
                          cursor: 'pointer'
                        }}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '9px', textAlign: 'center' }}>MAX: {maxTigersPerWallet}</div>
                  </div>

                {/* PRICE */}
                <div style={{ flex: '1', marginTop: isMobile ? '16px' : '0' }}>
                  <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '6px', fontSize: '12px' }}>PRICE DETAILS</div>
                  <div style={{ 
                    backgroundColor: 'black', 
                    border: '2px solid',
                    borderTopColor: '#ffd700',
                    borderLeftColor: '#ffd700',
                    borderRightColor: '#aa8e00',
                    borderBottomColor: '#aa8e00',
                    padding: '8px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>PRICE PER TIGER:</div>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '8px',
                      fontSize: '12px'
                    }}>
                      <FaBitcoin style={{ color: '#f7931a', marginRight: '4px' }} />
                      <span>{usdToBtc(typeof price === 'number' ? price : 0)} BTC</span>
                      <span style={{ color: '#666', marginLeft: '4px', fontSize: '10px' }}>
                        (${typeof price === 'number' ? price.toFixed(2) : '0.00'})
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '10px', color: '#aaa' }}>TOTAL:</div>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12px'
                    }}>
                      <FaBitcoin style={{ color: '#f7931a', marginRight: '4px' }} />
                      <span>{usdToBtc(typeof price === 'number' ? price * quantity : 0)} BTC</span>
                      <span style={{ color: '#666', marginLeft: '4px', fontSize: '10px' }}>
                        (${typeof price === 'number' && typeof quantity === 'number' ? (price * quantity).toFixed(2) : '0.00'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* MINT BUTTON */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                marginTop: '16px'
              }}>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !canMint || isSoldOut}
                  className="shine-effect"
                  style={{ 
                    backgroundColor: isLoading || !canMint || isSoldOut ? '#333' : '#ffd700', 
                    color: isLoading || !canMint || isSoldOut ? '#666' : 'black', 
                    padding: '10px',
                    width: '200px',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    border: '2px solid',
                    borderTopColor: isLoading || !canMint || isSoldOut ? '#444' : '#ffd700',
                    borderLeftColor: isLoading || !canMint || isSoldOut ? '#444' : '#ffd700',
                    borderRightColor: isLoading || !canMint || isSoldOut ? '#222' : '#aa8e00',
                    borderBottomColor: isLoading || !canMint || isSoldOut ? '#222' : '#aa8e00',
                    opacity: (isLoading || !canMint || isSoldOut) ? 0.5 : 1,
                    cursor: (isLoading || !canMint || isSoldOut) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'PROCESSING...' : (isSoldOut ? 'BATCH SOLD OUT' : 'MINT NOW')}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaLock style={{ color: '#ffd700' }} size={9} />
                  <span style={{ fontSize: '9px', color: '#ffd700' }}>
                    {isSoldOut ? 'WAITING FOR NEXT BATCH' : 'SECURE BTC TRANSACTION'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* INFO */}
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              border: '2px solid',
              borderTopColor: '#ffd700',
              borderLeftColor: '#ffd700',
              borderRightColor: '#aa8e00',
              borderBottomColor: '#aa8e00',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '8px', fontSize: '12px' }}>ABOUT BITCOIN TIGERS</div>
              <p style={{ fontSize: '10px', lineHeight: '1.4', color: '#ddd' }}>
                Each Bitcoin Tiger is a unique digital collectible inscribed on the Bitcoin blockchain.
                After minting, your Ordinals will be sent to your Bitcoin address within 24 hours.
                Join the exclusive Bitcoin Tiger Collective community today!
              </p>
              <div style={{ marginTop: '10px', fontSize: '10px', color: '#ffd700', borderTop: '1px solid #333', paddingTop: '10px' }}>
                ADDRESS TYPES:
              </div>
              <p style={{ fontSize: '9px', lineHeight: '1.4', color: '#ddd', marginTop: '5px' }}>
                • bc1p addresses (Taproot): Required for receiving Ordinals<br />
                • bc1q addresses (SegWit): Used for payments only
              </p>
            </div>
            
            {/* FAQ Section - On desktop in right column */}
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              border: '2px solid',
              borderTopColor: '#ffd700',
              borderLeftColor: '#ffd700',
              borderRightColor: '#aa8e00',
              borderBottomColor: '#aa8e00',
              padding: '16px'
            }}>
              <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '12px', fontSize: '14px', textAlign: 'center' }}>FAQ</div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  color: '#ffd700', 
                  fontSize: '11px', 
                  marginBottom: '4px', 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: '5px'
                }}>
                  <span>Q:</span>
                  <span>What are Bitcoin Ordinals?</span>
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#ddd', 
                  lineHeight: '1.4',
                  paddingLeft: '15px'
                }}>
                  Ordinals are digital artifacts native to the Bitcoin blockchain, allowing for direct inscription of content like images onto individual satoshis.
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  color: '#ffd700', 
                  fontSize: '11px', 
                  marginBottom: '4px', 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: '5px'
                }}>
                  <span>Q:</span>
                  <span>How do I store my Bitcoin Tiger Ordinals?</span>
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#ddd', 
                  lineHeight: '1.4',
                  paddingLeft: '15px'
                }}>
                  You'll need a wallet that supports Ordinals. We recommend using Ordinals-compatible wallets with Taproot support (bc1p addresses).
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  color: '#ffd700', 
                  fontSize: '11px', 
                  marginBottom: '4px', 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: '5px'
                }}>
                  <span>Q:</span>
                  <span>What utility do Bitcoin Tiger Ordinals offer?</span>
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#ddd', 
                  lineHeight: '1.4',
                  paddingLeft: '15px'
                }}>
                  Bitcoin Tigers provide BTC staking rewards, access to exclusive treasure chests, Lightning Network channels, and play-to-earn games with real Bitcoin rewards.
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  color: '#ffd700', 
                  fontSize: '11px', 
                  marginBottom: '4px', 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: '5px'
                }}>
                  <span>Q:</span>
                  <span>Why are there different batches?</span>
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#ddd', 
                  lineHeight: '1.4',
                  paddingLeft: '15px'
                }}>
                  Each batch has its own unique characteristics and utility features. Earlier batches (lower numbers) typically offer enhanced benefits in our ecosystem.
                </div>
              </div>
              
              <div style={{ marginBottom: '0' }}>
                <div style={{ 
                  color: '#ffd700', 
                  fontSize: '11px', 
                  marginBottom: '4px', 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: '5px'
                }}>
                  <span>Q:</span>
                  <span>When will I receive my Bitcoin Tiger after minting?</span>
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#ddd', 
                  lineHeight: '1.4',
                  paddingLeft: '15px'
                }}>
                  Your Bitcoin Tiger Ordinals will be inscribed and sent to your provided Bitcoin address within 24 hours of successful payment confirmation.
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Batch Information */}
        {isMobile && (
          <div style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            border: '2px solid',
            borderTopColor: '#ffd700',
            borderLeftColor: '#ffd700',
            borderRightColor: '#aa8e00',
            borderBottomColor: '#aa8e00',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '8px', fontSize: '12px' }}>BATCH PRICES</div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              fontSize: '9px'
            }}>
              {(loading || !Array.isArray(batches) ? batchesFallback : batches).map(batch => (
                <div 
                  key={batch.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    backgroundColor: batch.id === currentBatch ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                    border: batch.id === currentBatch ? '1px solid #ffd700' : '1px solid #333'
                  }}
                >
                  <span>Batch #{batch.id}{batch.id === 16 ? ' (FCFS)' : ''}</span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <FaBitcoin style={{ color: '#f7931a', marginRight: '2px', fontSize: '8px' }} />
                    {usdToBtc(typeof batch.price === 'number' ? batch.price : 0)} BTC
                  </span>
                </div>
              ))}
            </div>
            
            {/* Batch 15 apart onder de batches 1-14 */}
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '4px 6px',
                marginTop: '8px',
                backgroundColor: Number(currentBatch) === 15 ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                border: Number(currentBatch) === 15 ? '1px solid #ffd700' : '1px solid #333',
                fontSize: '9px'
              }}
            >
              <span>Batch #15:</span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <FaBitcoin style={{ color: '#f7931a', marginRight: '2px', fontSize: '8px' }} />
                {usdToBtc(loading ? 
                  (typeof batchesFallback[14].price === 'number' ? batchesFallback[14].price : 0) : 
                  (typeof batches[14]?.price === 'number' ? batches[14].price : 0))} BTC
              </span>
            </div>
            
            <div style={{ marginTop: '12px', fontSize: '9px', color: '#aaa', lineHeight: '1.4' }}>
              • Each batch has 66 ordinals
              <br />
              • Total supply: 999 Bitcoin Tigers
              <br />
              • Open to everyone with a bc1p address
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}