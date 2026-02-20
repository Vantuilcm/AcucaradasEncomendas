import React from 'react';
import { StripeProvider as StripeProviderBase } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from '../config/stripe';
import LoggingService from '../services/LoggingService';

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const publishableKey = (STRIPE_PUBLISHABLE_KEY || '').trim();
  if (!publishableKey) {
    try {
      LoggingService.getInstance().warn('Stripe publishable key ausente. StripeProvider desativado.');
    } catch {}
    return <>{children}</>;
  }
  return (
    <StripeProviderBase publishableKey={publishableKey}>{children}</StripeProviderBase>
  );
};
