import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export default function OrderConfirmationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirmação do Pedido</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
