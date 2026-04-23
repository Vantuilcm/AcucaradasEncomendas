import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { render } from '@testing-library/react-native';

describe('AuthContext Import', () => {
  it('renders provider', () => {
    const { toJSON } = render(
      <AuthProvider>
        <></>
      </AuthProvider>
    );
    expect(toJSON()).toBeNull();
  });
});
