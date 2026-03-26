import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaContext } from 'react-native-safe-area-context';
import SafeAreaContextDefault from 'react-native-safe-area-context';

describe('SafeAreaContext Mock', () => {
  it('should have SafeAreaContext defined', () => {
    console.log('SafeAreaContext named:', SafeAreaContext);
    console.log('SafeAreaContext default:', SafeAreaContextDefault);
    expect(SafeAreaContext).toBeDefined();
    expect(SafeAreaContextDefault).toBeDefined();
    expect(SafeAreaContext.Consumer).toBeDefined();
    expect(SafeAreaContextDefault.Consumer).toBeDefined();
  });

  it('should render Consumer', () => {
    const { getByText } = render(
      <SafeAreaContext.Consumer>
        {(insets) => <React.Fragment>Insets: {JSON.stringify(insets)}</React.Fragment>}
      </SafeAreaContext.Consumer>
    );
    // expect(getByText(/Insets/)).toBeTruthy();
  });
});
