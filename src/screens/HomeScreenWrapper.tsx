import React from 'react';
import { View, StyleSheet } from 'react-native';
import HomeScreen from './HomeScreen';
import LegalDocumentLinks from '../components/LegalDocumentLinks';

/**
 * Wrapper para HomeScreen que adiciona os links para documentos legais
 */
export default function HomeScreenWrapper(props: any) {
  return (
    <View style={styles.container}>
      {/* Renderiza o HomeScreen original */}
      <HomeScreen {...props} />

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
