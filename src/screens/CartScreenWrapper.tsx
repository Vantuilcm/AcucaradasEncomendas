import React from 'react';
import { View, StyleSheet } from 'react-native';
import CartScreen from './CartScreen';
import LegalDocumentLinks from '../components/LegalDocumentLinks';

/**
 * Wrapper para CartScreen que adiciona os links para documentos legais
 */
export default function CartScreenWrapper(props: any) {
  return (
    <View style={styles.container}>
      {/* Renderiza o CartScreen original */}
      <CartScreen {...props} />

      {/* Adiciona os links para documentos legais no final da tela */}
      <View style={styles.legalContainer}>
        <LegalDocumentLinks
          horizontal={true}
          contextMessage="Seus dados de compra estão protegidos de acordo com nossa política de privacidade."
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
