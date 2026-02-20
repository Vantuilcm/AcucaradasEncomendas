export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'cash';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface PaymentCard {
  id: string;
  userId: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  type?: 'payment' | 'refund' | 'payout' | 'cashback';
  description?: string;
  cardId?: string;
  pixCode?: string;
  errorMessage?: string;
  metadata?: {
    [key: string]: string | number | boolean | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRefund {
  id: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  totalTransactions: number;
  totalAmount: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
  byMethod: {
    [key in PaymentMethod]: {
      count: number;
      total: number;
    };
  };
  byStatus: {
    [key in PaymentStatus]: number;
  };
}

export interface PaymentSettings {
  userId: string;
  defaultMethod: PaymentMethod;
  saveCards: boolean;
  autoPay: boolean;
  notifications: {
    paymentSuccess: boolean;
    paymentFailed: boolean;
    refundIssued: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PixKey {
  id: string;
  userId: string;
  type: 'cpf' | 'email' | 'phone' | 'evp';
  value: string;
  isDefault: boolean;
  createdAt: string;
}
