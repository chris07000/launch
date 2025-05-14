'use client';

import VerifyWhitelist from '../../mint/verify-whitelist';

export default function WhitelistToolPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold text-center text-yellow-500 mb-8">
          Admin Whitelist Management Tool
        </h1>
        
        <VerifyWhitelist />
      </div>
    </div>
  );
} 