import { updateOrderStatus } from '@/api/mint';

interface Transaction {
  vout: {
    scriptpubkey_address: string;
    value: number;
  }[];
} 