'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaBitcoin, FaCopy, FaCheckCircle, FaTwitter, FaDiscord, FaSpinner, FaQrcode } from 'react-icons/fa';

export default function PaymentPage({ params }: { params: { orderId: string } }) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('30:00');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'completed' | 'failed'>('pending');
  const [showOrdinal, setShowOrdinal] = useState(false);
  
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
  
  // Fetch order data
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch order data from API
        const response = await fetch(`/api/mint/${params.orderId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch order');
        }
        
        const data = await response.json();
        
        // Debug logging
        console.log('Order data received:', data);
        console.log('BTC price data:', {
          totalPriceBtc: data.totalPriceBtc, 
          pricePerUnitBtc: data.pricePerUnitBtc,
          totalPrice: data.totalPrice // This might be the BTC price in some implementations
        });
        
        setOrderData(data);
        setPaymentStatus(data.status || 'pending');
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error loading order');
        setIsLoading(false);
      }
    };
    
    fetchOrderData();
  }, [params.orderId]);
  
  // Poll for payment status updates periodically
  useEffect(() => {
    if (isLoading || error || paymentStatus === 'completed' || paymentStatus === 'failed') {
      return; // Don't poll if loading, error, or already completed/failed
    }
    
    const pollInterval = setInterval(async () => {
      try {
        // First check if the order status has updated
        const statusResponse = await fetch(`/api/mint/${params.orderId}`);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.status !== paymentStatus) {
            setPaymentStatus(statusData.status);
            if (statusData.status === 'completed') {
              setShowOrdinal(true);
              clearInterval(pollInterval);
              return;
            }
          }
        }

        // If status is still pending, try to verify payment
        if (paymentStatus === 'pending') {
          const verifyResponse = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: params.orderId
            }),
          });
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            if (verifyData.verified && verifyData.status !== paymentStatus) {
              setPaymentStatus(verifyData.status);
              if (verifyData.status === 'completed' || verifyData.status === 'paid') {
                setShowOrdinal(true);
                if (verifyData.status === 'completed') {
                  clearInterval(pollInterval);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error polling for payment status:', err);
      }
    }, 15000); // Poll every 15 seconds
    
    return () => clearInterval(pollInterval);
  }, [isLoading, error, paymentStatus, params.orderId]);
  
  // Payment countdown
  useEffect(() => {
    // Don't start countdown if payment is already completed or failed
    if (paymentStatus === 'completed' || paymentStatus === 'failed') {
      return;
    }
    
    // Start with 30 minutes for Bitcoin payments
    if (!timeLeft || timeLeft === '30:00') {
      setTimeLeft('30:00');
    }
    
    const countdownInterval = setInterval(() => {
      setTimeLeft(current => {
        const [mins, secs] = current.split(':').map(Number);
        let newMins = mins;
        let newSecs = secs - 1;
        
        if (newSecs < 0) {
          newMins -= 1;
          newSecs = 59;
        }
        
        if (newMins < 0) {
          clearInterval(countdownInterval);
          return '00:00';
        }
        
        return `${newMins.toString().padStart(2, '0')}:${newSecs.toString().padStart(2, '0')}`;
      });
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, [paymentStatus]);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Function to simulate payment completion (for development)
  const simulatePayment = async () => {
    try {
      // Only for demonstration purposes
      const response = await fetch(`/api/mint/${params.orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: paymentStatus === 'pending' ? 'paid' : 'completed'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      const data = await response.json();
      setPaymentStatus(data.status);
      
      if (data.status === 'completed') {
        setShowOrdinal(true);
      }
    } catch (err) {
      console.error('Error simulating payment:', err);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pixel-grid-bg flex items-center justify-center" style={{ fontFamily: "'Press Start 2P', monospace" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '12px', fontSize: '12px' }}>LOADING PAYMENT...</div>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#ffd700', margin: '0 auto', animation: 'pulse 1s infinite' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white pixel-grid-bg flex items-center justify-center" style={{ fontFamily: "'Press Start 2P', monospace" }}>
        <div style={{ textAlign: 'center', maxWidth: '80%' }}>
          <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '12px', fontSize: '14px' }}>ERROR</div>
          <div style={{ color: '#ff4444', marginBottom: '20px', fontSize: '10px' }}>{error}</div>
          <div style={{ marginBottom: '24px', fontSize: '10px', color: '#aaa', maxWidth: '300px', margin: '0 auto' }}>
            It seems there was a problem finding your order. Please try minting again.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <Link href="/" style={{ color: '#ffd700', fontSize: '10px', textDecoration: 'none', padding: '8px 12px', border: '1px solid #ffd700' }}>
              RETURN TO MINT PAGE
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback if order data is not available
  const paymentData = orderData || {
    orderId: params.orderId,
    id: params.orderId,
    batchId: 1,
    quantity: 1,
    totalPriceUsd: 250.00,
    totalPriceBtc: 0.00625,
    paymentAddress: 'bc1qwfdxl0pq8d4tefd80enw3yae2k2dsszemrv6j0',
    btcAddress: 'bc1p3abcdefghjklmnpqrst...',
    pricePerUnit: 250.00,
    pricePerUnitBtc: 0.00625,
    status: 'pending'
  };

  // Helper function to safely format numbers
  const formatNumber = (value: any, decimals: number = 2) => {
    console.log(`Formatting value: ${value}, type: ${typeof value}, decimals: ${decimals}`);
    
    if (value === undefined || value === null) {
      console.log('Value is undefined or null, returning "0.00"');
      return "0.00";
    }
    
    try {
      // Convert string to number if needed
      const num = typeof value === 'string' ? parseFloat(value) : value;
      
      // Check if number is valid
      if (isNaN(num)) {
        console.log('Value is NaN, returning "0.00"');
        return "0.00";
      }
      
      // Make sure value is treated as a number
      const numValue = Number(num);
      console.log(`Converted to number: ${numValue}`);
      
      // Format with correct decimals
      const formatted = numValue.toFixed(decimals);
      console.log(`Formatted result: ${formatted}`);
      return formatted;
    } catch (err) {
      console.error("Error formatting number:", err);
      return "0.00";
    }
  };

  // Use the actual values from the order data
  const pricePerTiger = paymentData.pricePerUnitBtc;
  const totalPriceBtc = paymentData.totalPriceBtc;
  const totalPriceUsd = paymentData.totalPriceUsd;

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
          <Link href="/mint" style={{ color: '#ffd700', fontSize: '10px', textDecoration: 'none' }}>MINT</Link>
          <div style={{ display: 'flex', gap: '12px', marginLeft: '16px' }}>
            <FaTwitter color="#ffd700" size={14} />
            <FaDiscord color="#ffd700" size={14} />
          </div>
        </div>
      </nav>

      <div className="responsive-container" style={{ maxWidth: '500px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            color: '#ffd700', 
            fontSize: 'clamp(18px, 5vw, 24px)', 
            textShadow: '2px 2px 0 #000',
            marginBottom: '8px' 
          }}>
            {paymentStatus === 'completed' ? 'PAYMENT COMPLETE!' : 
             paymentStatus === 'paid' ? 'PAYMENT DETECTED!' : 'PAYMENT DETAILS'}
          </h1>
          <p style={{ color: '#aaa', fontSize: 'clamp(10px, 3vw, 12px)' }}>
            {paymentStatus === 'completed' ? 'Your Bitcoin Tiger will be minted and sent to your wallet!' : 
             paymentStatus === 'paid' ? 'Processing your Bitcoin Tiger purchase...' : 
             `Complete your Bitcoin Tiger purchase - Batch #${paymentData.batchId}`}
          </p>
        </div>
        
        {/* Payment Status Banner */}
        <div style={{ 
          backgroundColor: 
            paymentStatus === 'completed' ? 'rgba(22, 163, 74, 0.2)' : 
            paymentStatus === 'paid' ? 'rgba(59, 130, 246, 0.2)' : 
            'rgba(249, 115, 22, 0.2)',
          border: `2px solid ${
            paymentStatus === 'completed' ? '#16a34a' : 
            paymentStatus === 'paid' ? '#3b82f6' : 
            '#f97316'}`,
          padding: '12px',
          textAlign: 'center',
          marginBottom: '24px',
          animation: paymentStatus !== 'completed' ? 'pulse 2s infinite' : 'none'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '6px'
          }}>
            {paymentStatus === 'completed' ? (
              <FaCheckCircle color="#16a34a" size={18} />
            ) : paymentStatus === 'paid' ? (
              <FaSpinner color="#3b82f6" size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <FaQrcode color="#f97316" size={18} />
            )}
            <div style={{ 
              color: 
                paymentStatus === 'completed' ? '#16a34a' : 
                paymentStatus === 'paid' ? '#3b82f6' : 
                '#f97316', 
              fontSize: '14px',
              textShadow: '1px 1px 0 rgba(0,0,0,0.5)'
            }}>
              {paymentStatus === 'completed' ? 'PAYMENT CONFIRMED' : 
               paymentStatus === 'paid' ? 'PAYMENT DETECTED' : 
               'AWAITING PAYMENT'}
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#ddd', lineHeight: '1.4' }}>
            {paymentStatus === 'completed' ? 
              'Your Bitcoin Tiger is on the way! Please wait while it\'s being minted and sent to your wallet.' :
              paymentStatus === 'paid' ? 
              'We are processing your payment. Please wait...' :
              'Send the exact amount to the address below.'}
          </div>
        </div>
        
        {/* Show Ordinal if payment completed - No longer check for showOrdinal flag */}
        {paymentStatus === 'completed' && (
          <div style={{ 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            border: '3px solid #16a34a',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ 
              color: '#16a34a', 
              fontSize: '14px', 
              marginBottom: '15px', 
              textShadow: '1px 1px 0 #000' 
            }}>
              YOUR BITCOIN TIGER ORDINAL
            </div>
            
            {/* Ordinal Preview - Shows only logo with REVEAL SOON message */}
            <div style={{ 
              width: '260px', 
              height: '260px', 
              margin: '0 auto',
              border: '2px solid #333',
              backgroundColor: '#111',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <img 
                src="/images/tiger-logo.png"
                alt="Bitcoin Tiger Logo" 
                style={{
                  width: '180px',
                  height: '180px',
                  objectFit: 'contain'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '15px',
                left: '0',
                right: '0',
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '5px 0',
                color: '#ffd700',
                fontSize: '16px',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}>
                REVEAL SOON
              </div>
            </div>
            
            <div style={{ 
              fontSize: '9px', 
              color: '#aaa', 
              marginTop: '12px' 
            }}>
              {paymentData.inscription ? (
                <>Inscription #{paymentData.inscription.inscriptionId.substring(0, 8)} • Batch #{paymentData.inscription.batchId}</>
              ) : (
                <>Batch #{paymentData.batchId} • Order #{(paymentData.orderId || paymentData.id || "unknown").substring(0, 8)}</>
              )}
            </div>
            
            <div style={{ 
              marginTop: '16px', 
              fontSize: '10px', 
              color: '#ddd', 
              lineHeight: '1.5' 
            }}>
              Your payment has been confirmed! Your Bitcoin Tiger Ordinal will be inscribed and sent to your provided Taproot address within 24 hours.
              
            </div>
          </div>
        )}
        
        {/* Order Summary */}
        <div className="responsive-margin" style={{ 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          border: '3px solid',
          borderTopColor: '#ffd700',
          borderLeftColor: '#ffd700',
          borderRightColor: '#aa8e00',
          borderBottomColor: '#aa8e00',
          padding: '20px',
          marginBottom: '24px',
          opacity: paymentStatus === 'completed' ? 0.8 : 1
        }}>
          <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', fontSize: '14px', marginBottom: '10px', textAlign: 'center' }}>
            ORDER SUMMARY
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <div style={{ fontSize: '10px', color: '#aaa' }}>ORDER ID:</div>
            <div style={{ fontSize: '10px' }}>{paymentData.orderId || paymentData.id || "unknown"}</div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <div style={{ fontSize: '10px', color: '#aaa' }}>BATCH:</div>
            <div style={{ fontSize: '10px' }}>#{paymentData.batchId}</div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <div style={{ fontSize: '10px', color: '#aaa' }}>QUANTITY:</div>
            <div style={{ fontSize: '10px' }}>{paymentData.quantity} Tigers</div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <div style={{ fontSize: '10px', color: '#aaa' }}>PRICE PER TIGER:</div>
            <div style={{ fontSize: '10px' }}>${formatNumber(pricePerTiger)}</div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '12px',
            paddingTop: '8px',
            borderTop: '1px solid #333'
          }}>
            <div style={{ fontSize: '12px', color: '#ffd700' }}>TOTAL AMOUNT:</div>
            <div style={{ fontSize: '12px', color: '#ffd700' }}>${formatNumber(totalPriceUsd)}</div>
          </div>
        </div>
        
        {/* Payment Details */}
        {paymentStatus !== 'completed' && (
          <div style={{ 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            border: '2px solid #ffd700',
            padding: '20px',
            marginBottom: '24px'
          }}>
            {/* Amount to Pay */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#ffd700', fontSize: '12px', marginBottom: '8px' }}>AMOUNT TO PAY</div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '12px',
                border: '1px solid #333'
              }}>
                <FaBitcoin color="#f7931a" size={20} />
                <div style={{ 
                  color: '#fff', 
                  fontSize: '18px',
                  fontFamily: 'monospace'
                }}>
                  {formatNumber(totalPriceBtc, 8)} BTC
                </div>
                <div style={{
                  color: '#666',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}>
                  (${formatNumber(totalPriceUsd, 2)})
                </div>
                <button
                  onClick={() => copyToClipboard(totalPriceBtc?.toString() || '0')}
                  style={{
                    marginLeft: 'auto',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                >
                  {copied ? (
                    <FaCheckCircle color="#16a34a" size={16} />
                  ) : (
                    <FaCopy color="#666" size={16} />
                  )}
                </button>
              </div>
            </div>
            
            {/* Payment Container - Only show if not completed */}
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
              {/* Payment details in columns */}
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                gap: '16px',
                marginBottom: '16px' 
              }}>
                {/* TIMER */}
                <div style={{ flex: '1' }}>
                  <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '6px', fontSize: '12px' }}>TIME REMAINING:</div>
                  <div style={{ 
                    backgroundColor: 'black', 
                    border: '2px solid',
                    borderTopColor: '#ffd700',
                    borderLeftColor: '#ffd700',
                    borderRightColor: '#aa8e00',
                    borderBottomColor: '#aa8e00',
                    padding: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '16px',
                      color: timeLeft === '00:00' ? '#ef4444' : 'white'
                    }}>{timeLeft}</div>
                  </div>
                </div>
                
                {/* AMOUNT */}
                <div style={{ flex: '1', marginTop: isMobile ? '16px' : '0' }}>
                  <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '6px', fontSize: '12px' }}>AMOUNT TO PAY:</div>
                  <div style={{ 
                    backgroundColor: 'black', 
                    border: '2px solid',
                    borderTopColor: '#ffd700',
                    borderLeftColor: '#ffd700',
                    borderRightColor: '#aa8e00',
                    borderBottomColor: '#aa8e00',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '14px' }}>{formatNumber(totalPriceBtc, 6)} BTC</span>
                  </div>
                </div>
              </div>
              
              {/* RECIPIENT BTC ADDRESS */}
              <div className="responsive-margin" style={{ marginBottom: '16px' }}>
                <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '6px', fontSize: '12px' }}>YOUR BTC ADDRESS (bc1p):</div>
                <div style={{ 
                  backgroundColor: 'black', 
                  border: '2px solid',
                  borderTopColor: '#ffd700',
                  borderLeftColor: '#ffd700',
                  borderRightColor: '#aa8e00',
                  borderBottomColor: '#aa8e00',
                  padding: '8px'
                }}>
                  <div style={{ 
                    backgroundColor: '#111', 
                    border: '1px solid #333', 
                    padding: '10px',
                    fontSize: '9px'
                  }}>
                    {paymentData.btcAddress}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '8px', color: '#aaa' }}>
                    This is your Taproot (bc1p) address where the Ordinals will be sent after payment
                  </div>
                </div>
              </div>
              
              {/* PAYMENT BTC ADDRESS */}
              <div className="responsive-margin" style={{ marginBottom: '16px' }}>
                <div style={{ color: '#ffd700', textShadow: '1px 1px 0 #000', marginBottom: '6px', fontSize: '12px' }}>SEND PAYMENT TO (bc1q):</div>
                <div style={{ 
                  backgroundColor: 'black', 
                  border: '2px solid',
                  borderTopColor: '#ffd700',
                  borderLeftColor: '#ffd700',
                  borderRightColor: '#aa8e00',
                  borderBottomColor: '#aa8e00',
                  padding: '8px'
                }}>
                  <div style={{ 
                    backgroundColor: '#111', 
                    border: '1px solid #333', 
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1' }}>{paymentData.paymentAddress}</div>
                    <button 
                      onClick={() => copyToClipboard(paymentData.paymentAddress)}
                      style={{ 
                        marginLeft: '8px', 
                        backgroundColor: '#222',
                        border: 'none',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {copied ? <FaCheckCircle color="#4ade80" size={14} /> : <FaCopy color="#ffd700" size={14} />}
                    </button>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '8px', color: '#aaa' }}>
                    This is our SegWit (bc1q) address where you should send your payment
                  </div>
                </div>
              </div>
              
              {/* QR Code van de betalingsgegevens */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div className="tiger-logo-container" style={{ 
                  width: '250px', 
                  height: '250px', 
                  backgroundColor: '#fff', 
                  margin: '0 auto', 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #444',
                  position: 'relative',
                  padding: '15px'
                }}>
                  {/* QR Code for Bitcoin payment */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=bitcoin:${paymentData.paymentAddress}?amount=${paymentData.totalPriceBtc}`}
                    alt="Bitcoin Payment QR" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  
                  {/* Bitcoin logo overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FaBitcoin size={30} color="#f7931a" />
                  </div>
                </div>
                
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#ffd700', fontWeight: 'bold' }}>
                  {formatNumber(totalPriceBtc, 6)} BTC
                </div>
                <div style={{ marginTop: '4px', fontSize: '8px', color: '#aaa', textAlign: 'center' }}>
                  Scan QR code with your Bitcoin wallet to pay
                </div>
              </div>
              
              {/* Instructions */}
              <div className="responsive-margin" style={{ 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                border: '1px solid #444',
                padding: '10px',
                fontSize: '9px',
                color: '#ddd',
                marginBottom: '16px',
                lineHeight: '1.4'
              }}>
                <ol style={{ paddingLeft: '15px' }}>
                  <li>Send the exact amount to the payment address (bc1q) above</li>
                  <li>Your payment will be detected automatically</li>
                  <li>Your Tigers from Batch #{paymentData.batchId} will be sent to your Taproot address (bc1p) within 24 hours</li>
                </ol>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333', fontSize: '8px', color: '#aaa' }}>
                  • Important: bc1p addresses are for receiving Ordinals • bc1q addresses are for payments
                </div>
              </div>
            </div>
          </div>
        )}
          
        {/* BACK BUTTON */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link href="/" 
            className="shine-effect"
            style={{ 
              display: 'inline-block',
              backgroundColor: '#ffd700', 
              color: 'black', 
              padding: '8px 16px',
              border: '2px solid',
              borderTopColor: '#ffd700',
              borderLeftColor: '#ffd700',
              borderRightColor: '#aa8e00',
              borderBottomColor: '#aa8e00',
              fontSize: '12px',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            BACK TO HOME
          </Link>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 