import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProductScreen } from './ProductScreen';
import LegalDocumentLinks from '../components/LegalDocumentLinks';

/**
 * Wrapper para ProductScreen que adiciona os links para documentos legais
 */
export default function ProductScreenWrapper(props: any) {
  return (
    <View style={styles.container}>
      {/* Renderiza o ProductScreen original */}
      <ProductScreen {...props} />

      {/* Adiciona os links para documentos legais no final da tela */}
      <View style={styles.legalContainer}>
        <LegalDocumentLinks
          horizontal={true}
          contextMessage="Açucaradas Encomendas respeita sua privacidade."
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
  },
});
