const React = require('react');
const { render } = require('@testing-library/react-native');
const RootLayout = require('../../app/_layout').default;

describe('test', () => {
  it('works', () => {
    expect(1).toBe(1);
  });

  it('renders RootLayout without blocking navigator mount', () => {
    expect(() => render(React.createElement(RootLayout))).not.toThrow();
  });
});
