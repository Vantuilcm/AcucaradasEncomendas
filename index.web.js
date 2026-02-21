import { AppRegistry } from 'react-native';
import App from './App';

// Registra o componente principal
AppRegistry.registerComponent('main', () => App);

// Inicia a aplicação web
AppRegistry.runApplication('main', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});