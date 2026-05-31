export interface UserPreferencesDoc {
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  emailNotifications: boolean;
  promotions: boolean;
  newOrders: boolean;
  updatedAt?: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferencesDoc = {
  pushNotifications: true,
  whatsappNotifications: true,
  emailNotifications: true,
  promotions: true,
  newOrders: true,
};

export interface ProducerWalletEntry {
  id: string;
  orderId: string;
  label: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'other';
  date?: string;
}

export interface ProducerWalletSummary {
  availableBalance: number;
  pendingBalance: number;
  nextPayoutLabel: string;
  lastPayoutLabel: string;
  entries: ProducerWalletEntry[];
  hasMovements: boolean;
}

export interface ProducerDocumentationData {
  name: string;
  email: string;
  cpfCnpj: string | null;
  stripeAccountId: string | null;
  chargesEnabled: boolean | null;
  payoutsEnabled: boolean | null;
  detailsSubmitted: boolean | null;
  verificationLabel: string;
  currentlyDue: string[];
  eventuallyDue: string[];
}
