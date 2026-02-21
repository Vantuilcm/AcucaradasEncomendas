import { View, StyleSheet, FlatList, Pressable, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeIn,
  SlideInRight,
  SlideInUp,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import React from 'react';

import { Card } from '../src/components/base/Card';
import { Button } from '../src/components/base/Button';
import { StarRating } from '../src/components/StarRating';
import { LoadingSpinner, useLoading } from '../src/components/Loading/LoadingSpinner';
import {
  wp,
  hp,
  fontSize,
  spacing,
  useResponsiveDimensions,
  isTablet,
} from '../src/utils/responsive';

// Componente Text animado
const AnimatedText = Animated.createAnimatedComponent(View);

// Dados de exemplo para os pedidos
const pedidos = [
  {
    id: '1',
    cliente: 'Maria Silva',
    data: '2024-03-31',
    status: 'Em andamento',
    valor: 'R$ 150,00',
  },
  {
    id: '2',
    cliente: 'João Santos',
    data: '2024-03-30',
    status: 'Concluído',
    valor: 'R$ 200,00',
  },
];

// Dados de exemplo para os produtos
const produtosDestaque = [
  {
    id: '1',
    nome: 'Bolo de Chocolate',
    avaliacao: 4.5,
    numAvaliacoes: 12,
    imagem: 'https://via.placeholder.com/400x300',
  },
  {
    id: '2',
    nome: 'Bolo de Morango',
    avaliacao: 5.0,
    numAvaliacoes: 8,
    imagem: 'https://via.placeholder.com/400x300',
  },
  {
    id: '3',
    nome: 'Brigadeiros Gourmet',
    avaliacao: 4.8,
    numAvaliacoes: 15,
    imagem: 'https://via.placeholder.com/400x300',
  },
];

export default function Pedidos() {
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const dimensions = useResponsiveDimensions();
  const isLandscape = dimensions.width > dimensions.height;
  const { isLoading, showLoading, hideLoading, withLoading } = useLoading();

  // Handler para o scroll da lista
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animação para o título
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 50, 100], [1, 0.8, 0.6], Extrapolate.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [0, 100], [0, -10], Extrapolate.CLAMP),
        },
      ],
    };
  });

  // Função para carregar detalhes do pedido
  const carregarDetalhesPedido = async (pedidoId: string) => {
    await withLoading(async () => {
      // Simula carregamento dos detalhes
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.push(`/detalhes-pedido/${pedidoId}`);
    }, 'Carregando detalhes do pedido...');
  };

  // Função para navegar para novo pedido
  const navegarParaNovoPedido = async () => {
    await withLoading(async () => {
      // Simula preparação da tela
      await new Promise(resolve => setTimeout(resolve, 800));
      router.push('/novo-pedido');
    }, 'Preparando formulário...');
  };

  // Função para navegar para produtos
  const navegarParaProdutos = async () => {
    await withLoading(async () => {
      // Simula carregamento dos produtos
      await new Promise(resolve => setTimeout(resolve, 1200));
      router.push('/produtos');
    }, 'Carregando produtos...');
  };

  const renderItem = ({ item, index }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={styles.pedidoItemContainer}
    >
      <Card onPress={() => carregarDetalhesPedido(item.id)} style={styles.pedidoItem}>
        <Animated.Text style={styles.cliente}>{item.cliente}</Animated.Text>
        <Animated.Text style={styles.data}>{item.data}</Animated.Text>
        <Animated.Text
          entering={FadeInRight.delay(index * 100 + 200).duration(300)}
          style={[styles.status, { color: item.status === 'Concluído' ? '#27ae60' : '#3498db' }]}
        >
          {item.status}
        </Animated.Text>
        <Animated.Text style={styles.valor}>{item.valor}</Animated.Text>
      </Card>
    </Animated.View>
  );

  const renderProdutoDestaque = ({ item, index }) => {
    // Valor animado para a escala do card
    const scale = useSharedValue(1);
    // Valor animado para a opacidade das estrelas
    const starsOpacity = useSharedValue(0);

    // Iniciar animação quando o componente for montado
    React.useEffect(() => {
      starsOpacity.value = withDelay(500 + index * 100, withTiming(1, { duration: 400 }));
    }, []);

    // Estilo animado para as estrelas
    const starsAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: starsOpacity.value,
        transform: [{ scale: starsOpacity.value }],
      };
    });

    // Funções para animação ao tocar
    const handlePressIn = () => {
      scale.value = withTiming(0.97, { duration: 150 });
    };

    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: 200 });
    };

    // Estilo animado para o card
    const cardAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100 + 300).duration(400)}
        style={styles.produtoItemContainer}
      >
        <Animated.View style={cardAnimatedStyle}>
          <Card
            onPress={() => router.push(`/detalhes-produto/${item.id}`)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.produtoItem}
          >
            <View style={styles.produtoImageContainer}>
              {item.imagem && (
                <Image
                  source={{ uri: item.imagem }}
                  style={styles.produtoImagem}
                  resizeMode="cover"
                />
              )}
            </View>

            <View style={styles.produtoInfo}>
              <Text style={styles.produtoNome} numberOfLines={1}>
                {item.nome}
              </Text>

              <Animated.View style={[styles.avaliacaoContainer, starsAnimatedStyle]}>
                <StarRating rating={item.avaliacao} size={14} />
                <Text style={styles.avaliacaoTexto}>({item.numAvaliacoes})</Text>
              </Animated.View>
            </View>
          </Card>
        </Animated.View>
      </Animated.View>
    );
  };

  // Layout em grade para tablets na horizontal
  const renderTabletLayout = () => (
    <View style={styles.tabletContainer}>
      <View style={styles.tabletHeaderContainer}>
        <Animated.Text style={[styles.title, headerAnimatedStyle]} entering={FadeIn.duration(500)}>
          Pedidos
        </Animated.Text>

        <Animated.View
          style={styles.tabletButtonContainer}
          entering={FadeIn.delay(400).duration(300)}
        >
          <Button
            title="Novo Pedido"
            onPress={navegarParaNovoPedido}
            variant="primary"
            disabled={isLoading}
          />
        </Animated.View>
      </View>

      <View style={styles.tabletContentContainer}>
        <View style={styles.tabletPedidosSection}>
          <Animated.FlatList
            data={pedidos}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={styles.tabletProdutosSection}>
          <Animated.Text style={styles.sectionTitle} entering={FadeIn.delay(100).duration(300)}>
            Produtos em Destaque
          </Animated.Text>

          <FlatList
            data={produtosDestaque}
            renderItem={renderProdutoDestaque}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.produtosListContent}
          />

          <Animated.View
            style={styles.verTodosContainer}
            entering={FadeIn.delay(400).duration(300)}
          >
            <Button
              title="Ver todos os produtos"
              onPress={navegarParaProdutos}
              variant="outline"
              size="small"
              disabled={isLoading}
            />
          </Animated.View>
        </View>
      </View>
      
      <LoadingSpinner
        visible={isLoading}
        type="dots"
        size="medium"
        color="#007bff"
        overlay
      />
    </View>
  );

  return isTablet() && isLandscape ? (
    renderTabletLayout()
  ) : (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, headerAnimatedStyle]} entering={FadeIn.duration(500)}>
        Pedidos
      </Animated.Text>

      <Animated.FlatList
        data={pedidos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View
            entering={SlideInUp.delay(200).duration(400)}
            style={styles.produtosContainer}
          >
            <Animated.Text style={styles.sectionTitle} entering={FadeIn.delay(100).duration(300)}>
              Produtos em Destaque
            </Animated.Text>

            <FlatList
              data={produtosDestaque}
              renderItem={renderProdutoDestaque}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.produtosListContent}
            />

            <Animated.View
              style={styles.verTodosContainer}
              entering={FadeIn.delay(400).duration(300)}
            >
              <Button
                title="Ver todos os produtos"
                onPress={navegarParaProdutos}
                variant="outline"
                size="small"
                disabled={isLoading}
              />
            </Animated.View>
          </Animated.View>
        }
      />

      <Animated.View
        style={styles.buttonContainer}
        entering={SlideInRight.delay(600).duration(500)}
      >
        <Button title="Novo Pedido" onPress={navegarParaNovoPedido} variant="primary" disabled={isLoading} />
      </Animated.View>
      
      <LoadingSpinner
        visible={isLoading}
        type="dots"
        size="medium"
        color="#007bff"
        overlay
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing(20),
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: fontSize(28),
    fontWeight: 'bold',
    marginBottom: spacing(20),
    color: '#333',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: hp(80),
  },
  pedidoItemContainer: {
    marginBottom: spacing(12),
  },
  pedidoItem: {
    padding: spacing(15),
    borderRadius: wp(12),
  },
  cliente: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    marginBottom: spacing(5),
    color: '#333',
  },
  data: {
    fontSize: fontSize(14),
    color: '#666',
    marginBottom: spacing(5),
  },
  status: {
    fontSize: fontSize(16),
    fontWeight: '600',
    marginBottom: spacing(5),
  },
  valor: {
    fontSize: fontSize(16),
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: spacing(20),
    right: spacing(20),
    borderRadius: wp(8),
    overflow: 'hidden',
  },
  // Novos estilos para produtos em destaque
  produtosContainer: {
    marginBottom: spacing(20),
  },
  sectionTitle: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    marginBottom: spacing(12),
    color: '#333',
  },
  produtosListContent: {
    paddingRight: spacing(20),
  },
  produtoItemContainer: {
    width: wp(150),
    marginRight: spacing(12),
  },
  produtoItem: {
    padding: spacing(12),
    height: hp(100),
    justifyContent: 'space-between',
  },
  produtoNome: {
    fontSize: fontSize(16),
    fontWeight: 'bold',
    color: '#333',
  },
  produtoAvaliacao: {
    fontSize: fontSize(14),
    color: '#666',
  },
  verTodosContainer: {
    marginTop: spacing(12),
    alignItems: 'flex-start',
  },
  // Estilos para layout em tablet
  tabletContainer: {
    flex: 1,
    padding: spacing(20),
    backgroundColor: '#f9f9f9',
  },
  tabletHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(20),
  },
  tabletButtonContainer: {
    width: wp(150),
  },
  tabletContentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletPedidosSection: {
    flex: 2,
    paddingRight: spacing(10),
  },
  tabletProdutosSection: {
    flex: 1,
    padding: spacing(10),
    backgroundColor: 'rgba(240, 240, 240, 0.5)',
    borderRadius: wp(10),
  },
  produtoImageContainer: {
    width: '100%',
    height: '60%',
    borderRadius: wp(10),
    overflow: 'hidden',
    marginBottom: spacing(10),
  },
  produtoImagem: {
    width: '100%',
    height: '100%',
  },
  produtoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avaliacaoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing(5),
  },
  avaliacaoTexto: {
    fontSize: fontSize(12),
    color: '#666',
    marginLeft: spacing(5),
  },
});
