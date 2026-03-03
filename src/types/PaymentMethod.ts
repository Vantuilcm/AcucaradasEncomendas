export type PaymentMethodType = 'credit_card' | 'debit_card' | 'pix';

export interface BasePaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard extends BasePaymentMethod {
  type: 'credit_card' | 'debit_card';
  cardNumber: string;
  cardHolder: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  brand: string;
}

export interface PixPayment extends BasePaymentMethod {
  type: 'pix';
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'evp';
}

export type PaymentMethod = CreditCard | PixPayment;
