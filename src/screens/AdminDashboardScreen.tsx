import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Divider, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAppTheme } from '../components/ThemeProvider';

export function AdminDashboardScreen() {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // MISSÃO ZERO TELA BRANCA: Bypassing heavy initializations
  useEffect(() => {
    setLoading(false);
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (loading) {
    return <LoadingState message="Carregando painel administrativo..." />;
  }

  // Verificar se o usuário é administrador ou produtor
  const role = ((user as any)?.role || (user as any)?.activeRole || '').toLowerCase();
  const hasAccess = role === 'admin' || role === 'producer' || role === 'produtor';

  if (!hasAccess) {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ padding: 20, alignItems: 'center' }}
      >
        <Text variant="headlineMedium" style={{ marginBottom: 20, color: theme.colors.primary }}>
          🛡️ Admin Diagnostic Mode
        </Text>
        
        <Card style={{ width: '100%', marginBottom: 20 }}>
          <Card.Content>
            <Text variant="titleMedium">Status da Operação</Text>
            <Divider style={{ marginVertical: 10 }} />
            <Text variant="bodyLarge">✅ Dashboard carregado com sucesso</Text>
            <Text variant="bodyMedium" style={{ marginTop: 10 }}>
              Os componentes pesados (Gráficos e Mapas) foram desativados temporariamente para isolar o problema da tela branca.
            </Text>
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('BootDiagnostic' as any)}
          style={{ marginTop: 30, width: '100%' }}
        >
          Ver Diagnóstico de Boot
        </Button>
        
        <Text style={{ marginTop: 40, color: '#999', fontSize: 12 }}>
          Se você está vendo esta tela, o problema da tela branca NÃO é estrutural no Dashboard.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    metricsBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      padding: 10,
    },
    metricItem: {
      alignItems: 'center',
      flex: 1,
    },
    metricValue: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    metricLabel: {
      fontSize: 12,
      color: '#666',
    },
  });
}
