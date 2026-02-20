/**
 * Componente de Badge de Status do Monitoramento
 * Exibe o status atual do sistema de monitoramento (normal, fallback, erro)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { webSocketManager } from '../../monitoring/WebSocketManager';
import { monitoringSetup } from '../../scripts/setupMonitoring';

interface MonitoringStatusBadgeProps {
  onPress?: () => void;
  compact?: boolean;
}

/**
 * Badge que exibe o status atual do sistema de monitoramento
 * Mostra visualmente se o sistema está funcionando normalmente ou em modo de fallback
 */
export const MonitoringStatusBadge: React.FC<MonitoringStatusBadgeProps> = ({ 
  onPress, 
  compact = false 
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Verificar status do WebSocketManager
  const isWebSocketFallback = webSocketManager.isInFallbackMode?.() || false;
  const isMonitoringFallback = monitoringSetup.isInFallbackMode?.() || false;
  
  // Determinar status geral
  let status: 'normal' | 'fallback' | 'error' = 'normal';
  let statusText = 'Monitoramento: Normal';
  let statusColor = '#4CAF50'; // Verde
  
  useEffect(() => {
    // Obter mensagens de erro quando em fallback
    if (isWebSocketFallback) {
      const wsError = webSocketManager.getInitializationError?.();
      if (wsError) setErrorMessage(wsError.message);
    } else if (isMonitoringFallback) {
      const monitoringError = monitoringSetup.getInitializationError?.();
      if (monitoringError) setErrorMessage(monitoringError.message);
    } else {
      setErrorMessage(null);
    }
  }, [isWebSocketFallback, isMonitoringFallback]);
  
  if (isWebSocketFallback && isMonitoringFallback) {
    status = 'error';
    statusText = 'Monitoramento: Erro';
    statusColor = '#F44336'; // Vermelho
  } else if (isWebSocketFallback || isMonitoringFallback) {
    status = 'fallback';
    statusText = 'Monitoramento: Fallback';
    statusColor = '#FF9800'; // Laranja
  }
  
  // Versão compacta (apenas ícone)
  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.badgeCompact, { backgroundColor: statusColor }]}
        disabled={!onPress}
      >
        <View style={styles.indicator} />
      </TouchableOpacity>
    );
  }
  
  // Versão completa com texto
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.badge, { backgroundColor: statusColor }]}
        disabled={!onPress}
      >
        <View style={styles.indicator} />
        <Text style={styles.text}>{statusText}</Text>
      </TouchableOpacity>
      
      {errorMessage && (status === 'fallback' || status === 'error') && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 8,
  },
  badgeCompact: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
    maxWidth: 250,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
});