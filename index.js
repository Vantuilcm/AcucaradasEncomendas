import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { registerRootComponent } from 'expo';
import App from './App';

// 🛡️ Inicialização Crítica Nativa
try {
  console.info('🛡️ [INDEX] Habilitando screens...');
  enableScreens(true);
} catch (e) {
  console.warn('⚠️ [INDEX] Falha ao habilitar screens:', e);
}

// 🛡️ Registrar App com Proteção Global
registerRootComponent(App);
