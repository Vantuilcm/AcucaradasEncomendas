import { AppRegistry } from 'react-native';
import { ExpoRoot } from 'expo-router';

// Registra o componente principal
export default function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

AppRegistry.registerComponent('main', () => App);
AppRegistry.runApplication('main', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});