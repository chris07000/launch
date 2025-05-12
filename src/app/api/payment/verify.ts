import { updateOrderStatus } from '@/api/mint';
import { syncOrdersToBatches } from '@/lib/storage';

interface Transaction {
  vout: {
    scriptpubkey_address: string;
    value: number;
  }[];
} 