import React from 'react';
import { StripeProvider as StripeProviderBase } from '../compat/stripeReactNative';
import { STRIPE_PUBLISHABLE_KEY } from '../config/stripe';

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    // @ts-ignore
    <StripeProviderBase publishableKey={STRIPE_PUBLISHABLE_KEY}>{children}</StripeProviderBase>
  );
};
