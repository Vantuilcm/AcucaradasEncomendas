import React from 'react';

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export default StripeProvider;
