import { useState, useCallback } from 'react';
import { DeliveryService } from '../services/DeliveryService';
import { DeliveryDetails, DeliveryStatus } from '../types/Delivery';
import { loggingService } from '../services/LoggingService';

const deliveryService = new DeliveryService();

export function useDelivery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calcula o valor da entrega com base na distância
   */
  const calculateDeliveryFee = useCallback((distanceInKm: number): number => {
    try {
      return deliveryService.calculateDeliveryFee(distanceInKm);
    } catch (err) {
      loggingService.error('Erro ao calcular taxa de entrega', { distanceInKm, error: err });
      return 0;
    }
  }, []);

  /**
   * Verifica se a entrega é disponível para a distância
   */
  const isDeliveryAvailable = useCallback((distanceInKm: number): boolean => {
    return deliveryService.isDeliveryAvailable(distanceInKm);
  }, []);

  /**
   * Calcula o tempo estimado de entrega
   */
  const getEstimatedTime = useCallback((distanceInKm: number): number => {
    return deliveryService.getEstimatedDeliveryTime(distanceInKm);
  }, []);

  /**
   * Busca uma entrega pelo ID
   */
  const getDelivery = useCallback(async (deliveryId: string): Promise<DeliveryDetails | null> => {
    setLoading(true);
    setError(null);

    try {
      const delivery = await deliveryService.getDeliveryById(deliveryId);
      return delivery;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar entrega';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca entregas por status
   */
  const getDeliveriesByStatus = useCallback(
    async (status: DeliveryStatus): Promise<DeliveryDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        const deliveries = await deliveryService.getDeliveriesByStatus(status);
        return deliveries;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar entregas';
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Atualiza o status de uma entrega
   */
  const updateDeliveryStatus = useCallback(
    async (deliveryId: string, status: DeliveryStatus): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        await deliveryService.updateDeliveryStatus(deliveryId, status);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao atualizar status da entrega';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    calculateDeliveryFee,
    isDeliveryAvailable,
    getEstimatedTime,
    getDelivery,
    getDeliveriesByStatus,
    updateDeliveryStatus,
  };
}
