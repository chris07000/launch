export interface Order {
  id: string;
  btcAddress: string;
  quantity: number;
  totalPrice: number;
  totalPriceUsd?: number;
  pricePerUnit?: number;
  pricePerUnitBtc?: number;
  batchId: number;
  paymentAddress: string;
  paymentReference?: string;
  status: 'pending' | 'paid' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  inscriptionId?: string;
  inscription?: any;
}

export interface BatchConfig {
  id: number;
  price: number;
  maxWallets: number;
  mintedWallets: number;
  ordinals: number;
  isSoldOut: boolean;
  isFCFS?: boolean;
}

export interface Batch extends BatchConfig {}

export interface WhitelistEntry {
  address: string;
  batchId: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MintedWallet {
  address: string;
  batchId: number;
  quantity: number;
  timestamp: string;
} 