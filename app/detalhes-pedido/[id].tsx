import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInDown,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import { Card } from '../../src/components/base/Card';
import { Button } from '../../src/components/base/Button';
import { LoadingSpinner } from '../../src/components/Loading';
import {
  ENTRANCE_TIMING_CONFIG,
  SLOW_DURATION,
  getStaggeredDelay,
} from '../../src/utils/animations';

// Dados simulados de um pedido
const pedidoMock = {
  id: '1',
  cliente: 'Maria Silva',
  endereco: 'Rua das Flores, 123 - Centro',
  telefone: '(11) 98765-4321',
  data: '2024-03-31',
  horario: '15:30',
  status: 'Em andamento',
  pagamento: {
    metodo: 'Cartão de Crédito',
    valor: 'R$ 150,00',
    status: 'Aprovado',
  },
  itens: [
    {
      id: '1',
      nome: 'Bolo de Chocolate',
      quantidade: 1,
      valor: 'R$ 90,00',
      observacao: 'Sem nozes, com cobertura extra',
    },
    {
      id: '2',
      nome: 'Cupcakes',
      quantidade: 6,
      valor: 'R$ 60,00',
      observacao: 'Decoração temática',
    },
  ],
  observacoes: 'Entregar até as 18h, pois é para uma festa infantil.',
  total: 'R$ 150,00',
};

export default function DetalhesPedido() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [pedido, setPedido] = React.useState(null);

  const headerOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    // Simulando uma chamada de API
    setTimeout(() => {
      setPedido(pedidoMock);
      setIsLoading(false);

      // Animar entrada dos elementos
      headerOpacity.value = withTiming(1, { ...ENTRANCE_TIMING_CONFIG, duration: 600 });
      contentOpacity.value = withTiming(1, {
        ...ENTRANCE_TIMING_CONFIG,
        duration: 800,
        delay: 200,
      });
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    }, 1000);
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LoadingSpinner type="spinner" size="large" color="#3498db" overlay={false} />
        <Animated.Text style={styles.loadingText} entering={FadeIn.delay(400).duration(400)}>
          Carregando detalhes do pedido...
        </Animated.Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <Animated.Text style={styles.title} entering={FadeIn.duration(SLOW_DURATION)}>
          Pedido #{id}
        </Animated.Text>

        <Animated.Text
          style={[styles.status, { color: pedido.status === 'Concluído' ? '#27ae60' : '#3498db' }]}
          entering={FadeInRight.delay(200).duration(400)}
        >
          {pedido.status}
        </Animated.Text>
      </Animated.View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          <Card variant="outlined" style={styles.clienteCard}>
            <Animated.Text
              style={styles.sectionTitle}
              entering={FadeInDown.delay(getStaggeredDelay(0)).duration(400)}
            >
              Dados do Cliente
            </Animated.Text>

            <Animated.Text
              style={styles.clienteNome}
              entering={FadeInDown.delay(getStaggeredDelay(1)).duration(400)}
            >
              {pedido.cliente}
            </Animated.Text>

            <Animated.Text
              style={styles.clienteInfo}
              entering={FadeInDown.delay(getStaggeredDelay(2)).duration(400)}
            >
              {pedido.endereco}
            </Animated.Text>

            <Animated.Text
              style={styles.clienteInfo}
              entering={FadeInDown.delay(getStaggeredDelay(3)).duration(400)}
            >
              {pedido.telefone}
            </Animated.Text>
          </Card>

          <Card variant="elevated" style={styles.pedidoCard}>
            <Animated.Text
              style={styles.sectionTitle}
              entering={FadeInDown.delay(getStaggeredDelay(4)).duration(400)}
            >
              Detalhes do Pedido
            </Animated.Text>

            <View style={styles.dataContainer}>
              <Animated.Text
                style={styles.dataLabel}
                entering={FadeInDown.delay(getStaggeredDelay(5)).duration(400)}
              >
                Data:
              </Animated.Text>
              <Animated.Text
                style={styles.dataValue}
                entering={FadeInDown.delay(getStaggeredDelay(5)).duration(400)}
              >
                {pedido.data}
              </Animated.Text>
            </View>

            <View style={styles.dataContainer}>
              <Animated.Text
                style={styles.dataLabel}
                entering={FadeInDown.delay(getStaggeredDelay(6)).duration(400)}
              >
                Horário:
              </Animated.Text>
              <Animated.Text
                style={styles.dataValue}
                entering={FadeInDown.delay(getStaggeredDelay(6)).duration(400)}
              >
                {pedido.horario}
              </Animated.Text>
            </View>

            <View style={styles.dataContainer}>
              <Animated.Text
                style={styles.dataLabel}
                entering={FadeInDown.delay(getStaggeredDelay(7)).duration(400)}
              >
                Pagamento:
              </Animated.Text>
              <Animated.Text
                style={styles.dataValue}
                entering={FadeInDown.delay(getStaggeredDelay(7)).duration(400)}
              >
                {pedido.pagamento.metodo} - {pedido.pagamento.status}
              </Animated.Text>
            </View>
          </Card>

          <Card variant="elevated" style={styles.itensCard}>
            <Animated.Text
              style={styles.sectionTitle}
              entering={FadeInDown.delay(getStaggeredDelay(8)).duration(400)}
            >
              Itens do Pedido
            </Animated.Text>

            {pedido.itens.map((item, index) => (
              <Animated.View
                key={item.id}
                style={styles.itemContainer}
                entering={FadeInDown.delay(getStaggeredDelay(9 + index)).duration(400)}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNome}>{item.nome}</Text>
                  <Text style={styles.itemValor}>{item.valor}</Text>
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemQuantidade}>Qtd: {item.quantidade}</Text>
                  {item.observacao ? (
                    <Text style={styles.itemObservacao}>Obs: {item.observacao}</Text>
                  ) : null}
                </View>
              </Animated.View>
            ))}

            <Animated.View
              style={styles.totalContainer}
              entering={FadeInDown.delay(getStaggeredDelay(9 + pedido.itens.length)).duration(400)}
            >
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{pedido.total}</Text>
            </Animated.View>
          </Card>

          {pedido.observacoes ? (
            <Card variant="outlined" style={styles.observacoesCard}>
              <Animated.Text
                style={styles.sectionTitle}
                entering={FadeInDown.delay(getStaggeredDelay(10 + pedido.itens.length)).duration(
                  400
                )}
              >
                Observações
              </Animated.Text>

              <Animated.Text
                style={styles.observacoesText}
                entering={FadeInDown.delay(getStaggeredDelay(11 + pedido.itens.length)).duration(
                  400
                )}
              >
                {pedido.observacoes}
              </Animated.Text>
            </Card>
          ) : null}
        </Animated.View>
      </ScrollView>

      <Animated.View style={styles.buttonContainer} entering={SlideInUp.delay(600).duration(500)}>
        <Button
          title="Voltar para Pedidos"
          onPress={() => router.push('/pedidos')}
          variant="outline"
          style={styles.button}
        />

        <Button
          title="Atualizar Status"
          onPress={() => {
            // Implementação futura
          }}
          variant="primary"
          style={styles.button}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Espaço para os botões
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  clienteCard: {
    marginBottom: 16,
  },
  clienteNome: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  clienteInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  pedidoCard: {
    marginBottom: 16,
  },
  dataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 16,
    color: '#666',
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itensCard: {
    marginBottom: 16,
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemValor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemQuantidade: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  itemObservacao: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    flex: 1,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  observacoesCard: {
    marginBottom: 16,
  },
  observacoesText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(249, 249, 249, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    marginHorizontal: 6,
  },
});
