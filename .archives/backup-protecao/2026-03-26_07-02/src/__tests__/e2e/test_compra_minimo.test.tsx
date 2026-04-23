
import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../../App';

jest.setTimeout(30000);

describe('Minimal App Test', () => {
  it('should render App without crashing', async () => {
    const { toJSON } = render(<App />);
    expect(toJSON()).toBeTruthy();
  });
});
