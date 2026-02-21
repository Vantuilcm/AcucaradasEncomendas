import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  SlideInLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  withDelay,
} from 'react-native-reanimated';

import { Card } from '../src/components/base/Card';
import { Button } from '../src/components/base/Button';
import { StarRating } from '../src/components/StarRating';
import { LoadingSpinner, useLoading } from '../src/components/Loading/LoadingSpinner';
import { VoiceSearch } from '../src/components/VoiceSearch';
import { ENTRANCE_TIMING_CONFIG, SLOW_DURATION, getStaggeredDelay } from '../src/utils/animations';
import {
  wp,
  hp,
  fontSize,
  spacing,
  useResponsiveDimensions,
  isTablet,
} from '../src/utils/responsive';

// Interface para categoria
interface Categoria {
  id: string;
  nome: string;
}

// Definir interface para o tipo de produto
interface Produto {
  id: string;
  nome: string;
  descricao: string;
  categoriaId: string;
  preco: number;
  imagem: string;
  avaliacao: number;
  numAvaliacoes: number;
}

// Dados simulados de categorias
const categorias: Categoria[] = [
  { id: 'todos', nome: 'Todos' },
  { id: '1', nome: 'Bolos' },
  { id: '2', nome: 'Doces' },
  { id: '3', nome: 'Salgados' },
  { id: '4', nome: 'Bebidas' },
];

// Dados simulados de produtos
const produtosMock: Produto[] = [
  {
    id: '1',
    nome: 'Bolo de Chocolate',
    descricao: 'Delicioso bolo de chocolate com cobertura especial',
    categoriaId: '1',
    preco: 90.0,
    imagem: 'https://via.placeholder.com/400x300',
    avaliacao: 4.5,
    numAvaliacoes: 2,
  },
  {
    id: '2',
    nome: 'Bolo de Morango',
    descricao: 'Bolo leve de baunilha com camadas de morangos frescos',
    categoriaId: '1',
    preco: 85.0,
    imagem: 'https://via.placeholder.com/400x300',
    avaliacao: 5.0,
    numAvaliacoes: 3,
  },
  {
    id: '3',
    nome: 'Brigadeiros Gourmet',
    descricao: 'Caixa com 20 brigadeiros em sabores variados',
    categoriaId: '2',
    preco: 60.0,
    imagem: 'https://via.placeholder.com/400x300',
    avaliacao: 4.8,
    numAvaliacoes: 5,
  },
  {
    id: '4',
    nome: 'Coxinha Festa',
    descricao: 'Bandeja com 50 mini coxinhas de frango',
    categoriaId: '3',
    preco: 75.0,
    imagem: 'https://via.placeholder.com/400x300',
    avaliacao: 4.2,
    numAvaliacoes: 4,
  },
  {
    id: '5',
    nome: 'Suco de Frutas Vermelhas',
    descricao: 'Jarra de 1L de suco natural',
    categoriaId: '4',
    preco: 25.0,
    imagem: 'https://via.placeholder.com/400x300',
    avaliacao: 4.9,
    numAvaliacoes: 7,
  },
];

export default function Produtos() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [highlightSearch, setHighlightSearch] = useState(false);
  const { isLoading, showLoading, hideLoading, withLoading } = useLoading();

  // Usar dimensões responsivas para ajustes
  const dimensions = useResponsiveDimensions();
  const isLandscape = dimensions.width > dimensions.height;

  // Animated values
  const contentOpacity = useSharedValue(0);
  const searchHeight = useSharedValue(0);
  const searchBarY = useSharedValue(20);
  const searchInputScale = useSharedValue(1);

  // Verificar se há parâmetro de busca recebido de outras telas
  useEffect(() => {
    if (params.search) {
      const searchTerm = String(params.search);
      setSearchQuery(searchTerm);

      // Destacar a barra de busca para o usuário perceber
      searchInputScale.value = withSequence(
        withTiming(1.05, { duration: 300 }),
        withTiming(1, { duration: 300 })
      );

      setHighlightSearch(true);
      setTimeout(() => {
        setHighlightSearch(false);
      }, 1500);
    }
  }, [params]);

  // Carregar produtos
  useEffect(() => {
    setTimeout(() => {
      setProdutos(produtosMock);
      setProdutosFiltrados(produtosMock);
      setIsLoadingData(false);

      // Animar entrada dos elementos
      contentOpacity.value = withTiming(1, ENTRANCE_TIMING_CONFIG);
      searchHeight.value = withTiming(isTablet() ? hp(60) : hp(50), {
        ...ENTRANCE_TIMING_CONFIG,
        duration: 400,
      });
      searchBarY.value = withTiming(0, { ...ENTRANCE_TIMING_CONFIG, duration: 400 });
    }, 800); // Reduzido de 1000ms para 800ms
  }, []);

  // Filtrar produtos por categoria e busca
  useEffect(() => {
    let filtered = produtos;

    // Filtrar por categoria
    if (categoriaAtiva !== 'todos') {
      filtered = filtered.filter(produto => produto.categoriaId === categoriaAtiva);
    }

    // Filtrar por texto de busca
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        produto =>
          produto.nome.toLowerCase().includes(query) ||
          produto.descricao.toLowerCase().includes(query)
      );
    }

    // Animar a mudança de produtos
    contentOpacity.value = withSequence(
      withTiming(0.7, { duration: 150 }),
      withTiming(1, { duration: 300 })
    );

    setProdutosFiltrados(filtered);
  }, [categoriaAtiva, searchQuery, produtos]);

  // Estilos animados
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    height: searchHeight.value,
    transform: [{ translateY: searchBarY.value }],
    overflow: 'hidden',
  }));

  const searchInputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchInputScale.value }],
    backgroundColor: highlightSearch ? 'rgba(52, 152, 219, 0.1)' : '#fff',
  }));

  // Selecionar categoria
  const handleSelectCategoria = (categoriaId: string): void => {
    // Animar a mudança de categoria
    contentOpacity.value = withSequence(
      withTiming(0.7, { duration: 150 }),
      withTiming(1, { duration: 300 })
    );

    setCategoriaAtiva(categoriaId);
  };

  // Verificar categoria pelo termo de busca
  const verificarCategoriaPorBusca = (termo: string): void => {
    if (!termo) return;

    // Verificar se o termo de busca corresponde a alguma categoria
    const termoLower = termo.toLowerCase();

    const categoriasNomes: Record<string, string> = {
      bolo: '1',
      bolos: '1',
      doce: '2',
      doces: '2',
      brigadeiro: '2',
      salgado: '3',
      salgados: '3',
      coxinha: '3',
      bebida: '4',
      bebidas: '4',
      suco: '4',
    };

    // Verificar cada palavra-chave
    for (const [palavra, idCategoria] of Object.entries(categoriasNomes)) {
      if (termoLower.includes(palavra)) {
        setCategoriaAtiva(idCategoria);
        return;
      }
    }
  };

  // Determinar quantas colunas mostrar baseado no tamanho da tela
  const getNumColumns = (): number => {
    if (isTablet()) {
      return isLandscape ? 3 : 2;
    }
    return 1;
  };

  // Interfaces para os itens das listas
  interface ProdutoItemProps {
    item: Produto;
    index: number;
  }

  interface CategoriaItemProps {
    item: Categoria;
    index: number;
  }

  // Função para navegar para detalhes do produto
  const navegarParaDetalhes = async (produtoId: string) => {
    await withLoading(async () => {
      // Simula carregamento dos detalhes
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push(`/detalhes-produto/${produtoId}`);
    }, 'Carregando produto...');
  };

  // Renderizar item de produto
  const renderProdutoItem = ({ item, index }: ProdutoItemProps) => {
    const numColumns = getNumColumns();
    const itemStyle =
      numColumns > 1
        ? [styles.produtoItemContainer, styles.produtoItemGrid]
        : styles.produtoItemContainer;

    // Animação para o card
    const cardScale = useSharedValue(1);
    const ratingOpacity = useSharedValue(0);

    // Animar entrada das estrelas
    useEffect(() => {
      ratingOpacity.value = withDelay(500 + index * 100, withTiming(1, { duration: 400 }));
    }, []);

    // Estilo animado para as estrelas
    const ratingAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: ratingOpacity.value,
        transform: [{ scale: ratingOpacity.value }, { translateY: (1 - ratingOpacity.value) * 10 }],
      };
    });

    // Função para animar ao pressionar o card
    const handlePressIn = () => {
      cardScale.value = withTiming(0.97, { duration: 150 });
    };

    const handlePressOut = () => {
      cardScale.value = withTiming(1, { duration: 200 });
    };

    // Estilo animado para o card
    const cardAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: cardScale.value }],
      };
    });

    // Determinar cor baseada na avaliação
    const getRatingColor = () => {
      if (item.avaliacao >= 4.5) return '#2ecc71';
      if (item.avaliacao >= 3.5) return '#3498db';
      if (item.avaliacao >= 2.5) return '#f39c12';
      return '#e74c3c';
    };

    return (
      <Animated.View
        entering={FadeInDown.delay(getStaggeredDelay(index)).duration(400)}
        style={itemStyle}
      >
        <Animated.View style={cardAnimatedStyle}>
          <Card
            onPress={() => navegarParaDetalhes(item.id)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.produtoItem}
            animationDelay={index * 50}
          >
            <Image source={{ uri: item.imagem }} style={styles.produtoImagem} />

            <View style={styles.produtoInfo}>
              <Text style={styles.produtoNome} numberOfLines={1} ellipsizeMode="tail">
                {item.nome}
              </Text>

              <View style={styles.avaliacaoRow}>
                <Animated.View style={[styles.avaliacaoContainer, ratingAnimatedStyle]}>
                  <StarRating rating={item.avaliacao} size={16} />
                  <Text style={[styles.avaliacaoTexto, { color: getRatingColor() }]}>
                    ({item.numAvaliacoes})
                  </Text>
                </Animated.View>

                {item.avaliacao >= 4.5 && (
                  <Animated.View
                    style={[styles.bestSellerBadge, ratingAnimatedStyle]}
                    entering={FadeInDown.delay(getStaggeredDelay(index) + 200).duration(300)}
                  >
                    <Text style={styles.bestSellerText}>Mais Vendido</Text>
                  </Animated.View>
                )}
              </View>

              <Text style={styles.produtoDescricao} numberOfLines={2}>
                {item.descricao}
              </Text>

              <Text style={styles.produtoPreco}>R$ {item.preco.toFixed(2)}</Text>
            </View>
          </Card>
        </Animated.View>
      </Animated.View>
    );
  };

  // Renderizar item de categoria
  const renderCategoriaItem = ({ item, index }: CategoriaItemProps) => (
    <Animated.View entering={SlideInLeft.delay(getStaggeredDelay(index)).duration(400)}>
      <TouchableOpacity
        style={[styles.categoriaItem, categoriaAtiva === item.id && styles.categoriaItemAtiva]}
        onPress={() => handleSelectCategoria(item.id)}
      >
        <Text
          style={[styles.categoriaTexto, categoriaAtiva === item.id && styles.categoriaTextoAtivo]}
        >
          {item.nome}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Lidar com o resultado da busca por voz
  const handleVoiceSearchResult = (text: string): void => {
    setSearchQuery(text);
    verificarCategoriaPorBusca(text);

    // Animar a barra de busca para destacar o resultado
    searchInputScale.value = withSequence(
      withTiming(1.05, { duration: 300 }),
      withTiming(1, { duration: 300 })
    );

    setHighlightSearch(true);
    setTimeout(() => {
      setHighlightSearch(false);
    }, 1500);
  };

  if (isLoadingData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LoadingSpinner type="spinner" size="large" color="#3498db" overlay={false} />
        <Animated.Text style={styles.loadingText} entering={FadeIn.delay(400).duration(400)}>
          Carregando produtos...
        </Animated.Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <Animated.Text style={styles.title} entering={FadeIn.duration(SLOW_DURATION)}>
          Nossos Produtos
        </Animated.Text>
      </Animated.View>

      {/* Barra de busca */}
      <Animated.View style={[styles.searchBarContainer, searchBarAnimatedStyle]}>
        <View style={styles.searchInputContainer}>
          <Animated.View style={[{ flex: 1 }, searchInputAnimatedStyle]}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </Animated.View>
          <VoiceSearch
            onVoiceResult={handleVoiceSearchResult}
            placeholder="O que você está procurando?"
            style={styles.voiceSearch}
            language="pt-BR"
            onError={error => {
              console.error('Erro na busca por voz:', error);
              // Opcional: Mostrar um alerta ou toast com o erro
            }}
            accessibilityHint="Pressione para buscar produtos falando"
          />
        </View>
      </Animated.View>

      {/* Lista de categorias */}
      <View style={styles.categoriasContainer}>
        <FlatList
          data={categorias}
          renderItem={renderCategoriaItem}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriasContent}
        />
      </View>

      {/* Lista de produtos */}
      <Animated.View style={[styles.produtosContainer, contentAnimatedStyle]}>
        {produtosFiltrados.length > 0 ? (
          <FlatList
            data={produtosFiltrados}
            renderItem={renderProdutoItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.produtosContent}
            numColumns={getNumColumns()}
            key={getNumColumns().toString()} // Força recriação quando numColumns muda
            columnWrapperStyle={getNumColumns() > 1 ? styles.produtosGrid : null}
          />
        ) : (
          <Animated.View style={styles.emptyContainer} entering={FadeInDown.duration(400)}>
            <Text style={styles.emptyText}>Nenhum produto encontrado para esta busca.</Text>
            <Button
              title="Limpar filtros"
              onPress={() => {
                setCategoriaAtiva('todos');
                setSearchQuery('');
              }}
              variant="outline"
              style={styles.clearButton}
            />
          </Animated.View>
        )}
      </Animated.View>
      
      <LoadingSpinner
        visible={isLoading}
        type="spinner"
        size="medium"
        color="#3498db"
        overlay
      />
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
    marginTop: spacing(16),
    fontSize: fontSize(16),
    color: '#333',
  },
  header: {
    padding: spacing(16),
    paddingBottom: spacing(8),
  },
  backButton: {
    padding: spacing(8),
    marginBottom: spacing(4),
  },
  backButtonText: {
    fontSize: fontSize(16),
    color: '#3498db',
    fontWeight: '500',
  },
  title: {
    fontSize: fontSize(24),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(8),
  },
  searchBarContainer: {
    paddingHorizontal: spacing(16),
    marginBottom: spacing(12),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    backgroundColor: 'transparent',
    borderRadius: wp(8),
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: spacing(16),
    paddingVertical: spacing(10),
    fontSize: fontSize(16),
    marginRight: spacing(8),
    width: '100%',
  },
  voiceSearch: {
    marginLeft: spacing(4),
  },
  categoriasContainer: {
    marginBottom: spacing(16),
  },
  categoriasContent: {
    paddingHorizontal: spacing(16),
  },
  categoriaItem: {
    paddingHorizontal: spacing(16),
    paddingVertical: spacing(8),
    marginRight: spacing(8),
    borderRadius: wp(20),
    backgroundColor: '#f0f0f0',
  },
  categoriaItemAtiva: {
    backgroundColor: '#3498db',
  },
  categoriaTexto: {
    fontSize: fontSize(14),
    color: '#333',
  },
  categoriaTextoAtivo: {
    color: '#fff',
    fontWeight: '500',
  },
  produtosContainer: {
    flex: 1,
  },
  produtosContent: {
    padding: spacing(16),
    paddingTop: 0,
  },
  produtosGrid: {
    justifyContent: 'space-between',
  },
  produtoItemContainer: {
    marginBottom: spacing(16),
  },
  produtoItemGrid: {
    width: '48%', // Deixa um pouco de espaço entre os itens
    marginHorizontal: '1%',
  },
  produtoItem: {
    padding: 0,
    borderRadius: wp(8),
    overflow: 'hidden',
  },
  produtoImagem: {
    width: '100%',
    height: hp(150),
    resizeMode: 'cover',
  },
  produtoInfo: {
    padding: spacing(12),
  },
  produtoNome: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(4),
  },
  avaliacaoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  avaliacaoTexto: {
    fontSize: fontSize(12),
    color: '#666',
    marginLeft: spacing(4),
  },
  produtoDescricao: {
    fontSize: fontSize(14),
    color: '#666',
    marginBottom: spacing(8),
  },
  produtoPreco: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    color: '#3498db',
  },
  avaliacaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestSellerBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: wp(4),
    marginLeft: spacing(4),
  },
  bestSellerText: {
    fontSize: fontSize(12),
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(16),
  },
  emptyText: {
    fontSize: fontSize(16),
    color: '#666',
    textAlign: 'center',
    marginBottom: spacing(16),
  },
  clearButton: {
    width: wp(150),
  },
});
