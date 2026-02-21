import React from 'react';
import { View, StyleSheet } from 'react-native';
import CompletionScreen from './CompletionScreen';
import LegalDocumentLinks from '../components/LegalDocumentLinks';

/**
 * Wrapper para CompletionScreen que adiciona os links para documentos legais
 */
export default function CompletionScreenWrapper(props: any) {
  return (
    <View style={styles.container}>
      {/* Renderiza o CompletionScreen original */}
      <CompletionScreen {...props} />

      {/* Adiciona os links para documentos legais no final da tela */}
      <View style={styles.legalContainer}>
        <LegalDocumentLinks
          horizontal={true}
          contextMessage="Para mais informações sobre sua compra, consulte nossos documentos legais."
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
