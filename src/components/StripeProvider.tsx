import React from 'react';
import { StripeProvider as StripeProviderBase } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from '../config/stripe';

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    <StripeProviderBase publishableKey={STRIPE_PUBLISHABLE_KEY}>{children}</StripeProviderBase>
  );
};
