import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider } from '../../contexts/AuthContext';
import { OptimizedStateProvider } from '../../hooks/useOptimizedGlobalState';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <OptimizedStateProvider>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </OptimizedStateProvider>
  );
}
export async function flushMicrotasks() {
  await new Promise(resolve => setTimeout(resolve, 0));
}
