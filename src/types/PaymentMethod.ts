export type PaymentMethodType = 'credit_card' | 'debit_card' | 'pix';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard extends PaymentMethod {
  type: 'credit_card' | 'debit_card';
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  brand: string;
}

export interface PixPayment extends PaymentMethod {
  type: 'pix';
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'evp';
}
