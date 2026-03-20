import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';

describe('Simple Test', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<View testID="simple" />);
    expect(getByTestId('simple')).toBeTruthy();
  });
});
