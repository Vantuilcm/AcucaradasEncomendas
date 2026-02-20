import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import {
  Portal,
  Dialog,
  Button,
  Text,
  useTheme,
  ActivityIndicator,
  Divider,
  DataTable,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import {
  DemandForecastService,
  DemandForecast,
  SalesHistoryPoint,
} from '../services/DemandForecastService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OrderService } from '../services/OrderService';

interface DemandAnalysisDialogProps {
  visible: boolean;
  onDismiss: () => void;
  product: {
    id: string;
    name: string;
    price: number;
  } | null;
}

export const DemandAnalysisDialog: React.FC<DemandAnalysisDialogProps> = ({
  visible,
  onDismiss,
  product,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);

  const parseDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value?.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    }
    return null;
  };

  useEffect(() => {
    if (visible && product) {
      loadForecast();
    }
  }, [visible, product]);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const forecastService = DemandForecastService.getInstance();
      const orders = await OrderService.getInstance().getAllOrders();
      const history: SalesHistoryPoint[] = [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 180);

      for (const order of orders) {
        if (order.status === 'cancelled') continue;
        const createdAt = parseDate((order as any).createdAt) || parseDate((order as any).updatedAt);
        if (!createdAt) continue;
        if (createdAt.getTime() < cutoff.getTime()) continue;
        for (const item of order.items || []) {
          if (item.productId !== product!.id) continue;
          history.push({
            productId: product!.id,
            date: createdAt,
            quantity: item.quantity,
            price: item.unitPrice ?? product!.price,
          });
        }
      }

      if (history.length === 0) {
        setForecast(null);
        return;
      }

      const forecastStart = new Date();
      const forecastEnd = new Date();
      forecastEnd.setDate(forecastEnd.getDate() + 14);
      await forecastService.fetchExternalData(forecastStart, forecastEnd);

      const result = forecastService.generateForecast(product!.id, history);
      setForecast(result);
    } catch (error) {
      console.error('Erro ao carregar previsão:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.colors.primary,
    labelColor: (opacity = 1) => theme.colors.onSurfaceVariant,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const renderChart = () => {
    if (!forecast || forecast.forecastPoints.length === 0) return null;

    const labels = forecast.forecastPoints
      .filter((_, i) => i % 3 === 0) // Mostrar label a cada 3 dias
      .map(p => {
        const d = p.date;
        return `${d.getDate()}/${d.getMonth() + 1}`;
      });

    const data = forecast.forecastPoints.map(p => p.expectedQuantity);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Previsão para os Próximos 14 Dias</Text>
        <LineChart
          data={{
            labels,
            datasets: [{ data }],
          }}
          width={Dimensions.get('window').width - 80}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Análise de Demanda: {product?.name}</Dialog.Title>
        <Dialog.Content>
          <ScrollView style={styles.scroll}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Processando algoritmos de IA...</Text>
              </View>
            ) : forecast ? (
              <View>
                <View style={styles.scoreCard}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>
                      {Math.round(forecast.confidenceScore * 100)}%
                    </Text>
                    <Text style={styles.scoreLabel}>Confiança</Text>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>
                      {Math.round(
                        forecast.forecastPoints.reduce((sum, p) => sum + p.expectedQuantity, 0) /
                          forecast.forecastPoints.length
                      )}
                    </Text>
                    <Text style={styles.scoreLabel}>Média Diária</Text>
                  </View>
                </View>

                {renderChart()}

                <Text style={styles.sectionTitle}>Fatores Influenciadores</Text>
                {forecast.influencingFactors.map((f, i) => (
                  <View key={i} style={styles.factorRow}>
                    <MaterialCommunityIcons
                      name={f.impact > 0 ? 'trending-up' : 'trending-down'}
                      size={20}
                      color={f.impact > 0 ? '#4CAF50' : '#F44336'}
                    />
                    <Text style={styles.factorText}>{f.factor}</Text>
                    <Text
                      style={[
                        styles.impactText,
                        { color: f.impact > 0 ? '#4CAF50' : '#F44336' },
                      ]}
                    >
                      {f.impact > 0 ? '+' : ''}
                      {Math.round(f.impact * 100)}%
                    </Text>
                  </View>
                ))}

                <Divider style={styles.divider} />

                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Data</DataTable.Title>
                    <DataTable.Title numeric>Previsto</DataTable.Title>
                    <DataTable.Title numeric>Margem</DataTable.Title>
                  </DataTable.Header>

                  {forecast.forecastPoints.slice(0, 5).map((p, i) => (
                    <DataTable.Row key={i}>
                      <DataTable.Cell>
                        {p.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </DataTable.Cell>
                      <DataTable.Cell numeric>{Math.round(p.expectedQuantity)} un</DataTable.Cell>
                      <DataTable.Cell numeric>
                        ±{Math.round((p.upperBound - p.lowerBound) / 2)}
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </View>
            ) : (
              <Text>Não foi possível gerar a previsão para este produto.</Text>
            )}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Fechar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  scroll: {
    paddingBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#ddd',
  },
  chartContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  factorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  impactText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  divider: {
    marginVertical: 20,
  },
});
