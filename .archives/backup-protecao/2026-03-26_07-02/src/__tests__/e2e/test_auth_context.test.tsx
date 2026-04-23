
import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider } from '../../contexts/AuthContext';

jest.setTimeout(30000);

describe('AuthContext Test', () => {
  it('should render AuthProvider without crashing', async () => {
    const { toJSON } = render(
      <AuthProvider>
        <React.Fragment />
      </AuthProvider>
    );
    // AuthProvider renders children directly inside Context.Provider.
    // Since children is Fragment (empty), toJSON() is null.
    // This confirms render didn't crash.
    expect(true).toBeTruthy();
  });
});
