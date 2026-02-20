import React from 'react';
import { View, StyleSheet } from 'react-native';
import OrderCompletedScreen from './OrderCompletedScreen';
import LegalDocumentLinks from '../components/LegalDocumentLinks';

/**
 * Wrapper para a tela de pedido concluído que adiciona os links para documentos legais
 */
export default function OrderConfirmationScreenWrapper(props: any) {
  return (
    <View style={styles.container}>
      {/* Renderiza a tela de pedido concluído */}
      <OrderCompletedScreen {...props} />

      {/* Adiciona os links para documentos legais no final da tela */}
      <View style={styles.legalContainer}>
        <LegalDocumentLinks
          horizontal={true}
          contextMessage="Sua nota fiscal será enviada para seu e-mail em até 24 horas. Guarde este recibo eletrônico."
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
