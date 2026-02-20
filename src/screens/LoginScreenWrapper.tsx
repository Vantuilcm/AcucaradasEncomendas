import React from 'react';
import { View, StyleSheet } from 'react-native';
import LoginScreen from './LoginScreen';
import LegalDocumentLinks from '../components/LegalDocumentLinks';

/**
 * Wrapper para LoginScreen que adiciona os links para documentos legais
 */
export default function LoginScreenWrapper(props: any) {
  return (
    <View style={styles.container}>
      {/* Renderiza o LoginScreen original */}
      <LoginScreen {...props} />

      {/* Adiciona os links para documentos legais no final da tela */}
      <View style={styles.legalContainer}>
        <LegalDocumentLinks
          horizontal={true}
          contextMessage="Ao fazer login ou criar uma conta, você concorda com nossos"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  legalContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
});
