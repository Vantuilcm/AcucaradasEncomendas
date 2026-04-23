const fs = require('fs');
const React = require('react');

try {
  fs.appendFileSync('debug_trace.txt', '1. Start\n');
} catch (e) {}

const { render } = require('@testing-library/react-native');

try {
  fs.appendFileSync('debug_trace.txt', '2. RTL Required\n');
} catch (e) {}

const App = require('../../App').default;

try {
  fs.appendFileSync('debug_trace.txt', '3. App Required\n');
} catch (e) {}

describe('Debug Trace', () => {
  it('renders app', () => {
    try {
      fs.appendFileSync('debug_trace.txt', '4. Test Running\n');
    } catch (e) {}
    render(React.createElement(App));
    try {
      fs.appendFileSync('debug_trace.txt', '5. App Rendered\n');
    } catch (e) {}
  });
});
