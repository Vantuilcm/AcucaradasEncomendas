import React from 'react';
import { AppContent } from '../src/App';
import { StripeProvider } from '../src/components/StripeProvider';

export default function SrcAppRoute() {
  return (
    <StripeProvider>
      <AppContent />
    </StripeProvider>
  );
}
