import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { checkLegalDocumentsAvailability } from '../utils/legalDocuments';
import { startPeriodicWebsiteCheck } from '../utils/checkWebsiteStatus';

interface LegalDocsMonitorProps {
  monitoringInterval?: number; // Intervalo de verificação em minutos
  onStatusChange?: (status: Record<string, boolean>) => void;
  developmentOnly?: boolean; // Se verdadeiro, só aparece em ambiente de desenvolvimento
  minimized?: boolean; // Se verdadeiro, mostra versão compacta
}

/**
 * Componente para monitoramento contínuo dos documentos legais
 * Ideal para telas administrativas ou para uso durante desenvolvimento/depuração
 */
const LegalDocsMonitor: React.FC<LegalDocsMonitorProps> = ({
  monitoringInterval = 60,
  onStatusChange,
  developmentOnly = true,
  minimized = false,
}) => {
  const [status, setStatus] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(!minimized);

  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const shouldRender = !(developmentOnly && !isDevelopment);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }
    // Fazer verificação inicial
    checkStatus();

    // Configurar verificação periódica
    const stopMonitoring = startPeriodicWebsiteCheck(monitoringInterval, result => {
      const newStatus = {
        website: result.isOnline,
        privacyPolicy: result.documentsAvailable.privacyPolicy,
        termsOfUse: result.documentsAvailable.termsOfUse,
      };

      setStatus(newStatus);
      setLastChecked(new Date());

      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    });

    // Limpar ao desmontar
    return () => {
      stopMonitoring();
    };
  }, [monitoringInterval, onStatusChange, shouldRender]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await checkLegalDocumentsAvailability();
      setStatus(result);
      setLastChecked(new Date());

      if (onStatusChange) {
        onStatusChange(result);
      }
    } catch (error) {
      console.error('Erro ao verificar documentos legais:', error);
      setStatus({
        website: false,
        privacyPolicy: false,
        termsOfUse: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (isAvailable: boolean | undefined) => {
    if (isAvailable === undefined) return '⚪'; // Cinza para desconhecido
    return isAvailable ? '🟢' : '🔴'; // Verde para disponível, vermelho para indisponível
  };

  if (!shouldRender) {
    return null;
  }

  if (minimized && !expanded) {
    return (
      <TouchableOpacity
        style={styles.minimizedContainer}
        onPress={() => setExpanded(true)}
        accessibilityLabel="Expandir monitor de documentos legais"
      >
        <Text style={styles.minimizedText}>
          {getStatusIcon(status?.website)} {getStatusIcon(status?.privacyPolicy)}{' '}
          {getStatusIcon(status?.termsOfUse)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Monitor de Documentos Legais</Text>
        {minimized && (
          <TouchableOpacity onPress={() => setExpanded(false)}>
            <Text style={styles.minimizeButton}>−</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#FF69B4" />
      ) : (
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Site:</Text>
            <Text
              style={[
                styles.statusValue,
                status?.website ? styles.statusSuccess : styles.statusError,
              ]}
            >
              {status?.website ? 'Disponível' : 'Indisponível'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Política de Privacidade:</Text>
            <Text
              style={[
                styles.statusValue,
                status?.privacyPolicy ? styles.statusSuccess : styles.statusError,
              ]}
            >
              {status?.privacyPolicy ? 'Disponível' : 'Indisponível'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Termos de Uso:</Text>
            <Text
              style={[
                styles.statusValue,
                status?.termsOfUse ? styles.statusSuccess : styles.statusError,
              ]}
            >
              {status?.termsOfUse ? 'Disponível' : 'Indisponível'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.lastChecked}>
          {lastChecked
            ? `Última verificação: ${lastChecked.toLocaleTimeString()}`
            : 'Aguardando verificação...'}
        </Text>

        <TouchableOpacity style={styles.refreshButton} onPress={checkStatus} disabled={loading}>
          <Text style={styles.refreshButtonText}>Verificar agora</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    margin: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  minimizeButton: {
    fontSize: 18,
    color: '#666',
    paddingHorizontal: 8,
  },
  statusContainer: {
    marginVertical: 5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  statusLabel: {
    fontSize: 13,
    color: '#666',
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusSuccess: {
    color: '#4CAF50',
  },
  statusError: {
    color: '#F44336',
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastChecked: {
    fontSize: 11,
    color: '#999',
  },
  refreshButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  minimizedContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    padding: 5,
    margin: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  minimizedText: {
    fontSize: 12,
    paddingHorizontal: 5,
  },
});

export default LegalDocsMonitor;
