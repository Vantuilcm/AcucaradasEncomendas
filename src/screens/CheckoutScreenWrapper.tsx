import React from 'react';
import { View, StyleSheet } from 'react-native';
import CheckoutScreen from './CheckoutScreen';
import LegalDocumentLinks from '../components/LegalDocumentLinks';

/**
 * Wrapper para CheckoutScreen que adiciona os links para documentos legais
 */
export default function CheckoutScreenWrapper(props: any) {
  return (
    <View style={styles.container}>
      {/* Renderiza o CheckoutScreen original */}
      <CheckoutScreen {...props} />

      {/* Adiciona os links para documentos legais no final da tela */}
      <View style={styles.legalContainer}>
        <LegalDocumentLinks
          horizontal={true}
          contextMessage="Seus dados de pagamento são criptografados e protegidos de acordo com padrões internacionais de segurança."
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
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
});
