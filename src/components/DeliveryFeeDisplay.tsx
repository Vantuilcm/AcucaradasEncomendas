import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDelivery } from '../hooks/useDelivery';
import { DELIVERY_PRICE_PER_KM, BASE_DELIVERY_FEE } from '../constants/delivery';

interface DeliveryFeeDisplayProps {
  distanceInKm: number;
  showDetails?: boolean;
}

export function DeliveryFeeDisplay({ distanceInKm, showDetails = false }: DeliveryFeeDisplayProps) {
  const { calculateDeliveryFee, getEstimatedTime, isDeliveryAvailable } = useDelivery();

  const deliveryFee = calculateDeliveryFee(distanceInKm);
  const estimatedTime = getEstimatedTime(distanceInKm);
  const isAvailable = isDeliveryAvailable(distanceInKm);

  // Formatar a taxa de entrega como R$ XX,XX
  const formattedFee = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(deliveryFee);

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.unavailableText}>Entrega não disponível para esta localização</Text>
        <Text style={styles.helpText}>A distância máxima para entrega é de 25km</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mainInfo}>
        <Text style={styles.feeText}>Taxa de entrega: {formattedFee}</Text>
        <Text style={styles.timeText}>Tempo estimado: {estimatedTime} min</Text>
      </View>

      {showDetails && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>Distância: {distanceInKm.toFixed(1)}km</Text>
          <Text style={styles.detailText}>Taxa base: R$ {BASE_DELIVERY_FEE.toFixed(2)}</Text>
          <Text style={styles.detailText}>Valor por km: R$ {DELIVERY_PRICE_PER_KM.toFixed(2)}</Text>
          <Text style={styles.detailText}>
            Cálculo: R$ {BASE_DELIVERY_FEE.toFixed(2)} + ({distanceInKm.toFixed(1)}km × R${' '}
            {DELIVERY_PRICE_PER_KM.toFixed(2)})
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  timeText: {
    fontSize: 14,
    color: '#495057',
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  detailText: {
    fontSize: 13,
    color: '#6c757d',
    marginVertical: 2,
  },
  unavailableText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
  },
});
