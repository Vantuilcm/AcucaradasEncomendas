import React from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

interface SalesData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
    strokeColor?: string;
  }[];
}

interface PieChartData {
  name: string;
  value: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

type ChartType = 'bar' | 'line' | 'pie';

interface SalesChartProps {
  title: string;
  data: SalesData | PieChartData[];
  type: ChartType;
  description?: string;
  height?: number;
  width?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  showValues?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  yAxisSuffix?: string;
  yAxisPrefix?: string;
  customColors?: string[];
  animated?: boolean;
  chartStyle?: object;
}

export const SalesChart = ({
  title,
  data,
  type,
  description,
  height = 220,
  width = Dimensions.get('window').width - 40,
  showLegend = true,
  showLabels = true,
  showGrid = true,
  showValues = false,
  loading = false,
  error = null,
  onRetry,
  yAxisSuffix = '',
  yAxisPrefix = 'R$',
  customColors,
  animated = true,
  chartStyle,
}: SalesChartProps) => {
  const theme = useTheme();

  const chartColors = customColors || [
    '#FF69B4', // Rosa (cor principal)
    '#4CAF50', // Verde
    '#2196F3', // Azul
    '#FF9800', // Laranja
    '#9C27B0', // Roxo
  ];

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1, index = 0) => {
      if (chartColors && chartColors.length > 0) {
        const colorIndex = index % chartColors.length;
        return `${chartColors[colorIndex]}${Math.round(opacity * 255)
          .toString(16)
          .padStart(2, '0')}`;
      }
      return `rgba(255, 105, 180, ${opacity})`;
    },
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16,
      ...chartStyle,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForLabels: {
      fontSize: 12,
    },
    propsForBackgroundLines: {
      strokeWidth: showGrid ? 1 : 0,
      stroke: 'rgba(0, 0, 0, 0.1)',
    },
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    fillShadowGradient: '#FF69B4',
    fillShadowGradientOpacity: 0.3,
  };

  const renderChart = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <Text style={styles.retryText} onPress={onRetry}>
              Tentar novamente
            </Text>
          )}
        </View>
      );
    }

    switch (type) {
      case 'bar':
        return (
          <BarChart
            data={data as SalesData}
            width={width}
            height={height}
            yAxisLabel={yAxisPrefix}
            yAxisSuffix={yAxisSuffix}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            showValuesOnTopOfBars={showValues}
            fromZero
            withInnerLines={showGrid}
            withHorizontalLabels={showLabels}
            withVerticalLabels={showLabels}
            style={styles.chart}
            withCustomBarColorFromData={Array.isArray(customColors) && customColors.length > 1}
            flatColor={true}
            segments={5}
            showBarTops={true}
          />
        );
      case 'line':
        return (
          <LineChart
            data={data as SalesData}
            width={width}
            height={height}
            yAxisLabel={yAxisPrefix}
            yAxisSuffix={yAxisSuffix}
            chartConfig={chartConfig}
            bezier={animated}
            fromZero
            withInnerLines={showGrid}
            withHorizontalLabels={showLabels}
            withVerticalLabels={showLabels}
            withDots={true}
            style={styles.chart}
            segments={5}
          />
        );
      case 'pie':
        return (
          <PieChart
            data={data as PieChartData[]}
            width={width}
            height={height}
            chartConfig={chartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            hasLegend={showLegend}
            center={[width / 4, 0]}
            absolute={false}
            style={styles.chart}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card style={styles.container}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          {title}
        </Text>
        {description && (
          <Text variant="bodySmall" style={styles.description}>
            {description}
          </Text>
        )}
        <View style={styles.chartContainer}>{renderChart()}</View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 8,
    elevation: 2,
  },
  title: {
    marginBottom: 8,
    color: '#333',
    fontWeight: 'bold',
  },
  description: {
    color: '#666',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    borderRadius: 8,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF5252',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryText: {
    color: '#FF69B4',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
