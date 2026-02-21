import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInLeft,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { Card } from '../../src/components/base/Card';
import { Button } from '../../src/components/base/Button';
import { LoadingSpinner } from '../../src/components/Loading';
import { StarRating } from '../../src/components/StarRating';
import { VoiceSearch } from '../../src/components/VoiceSearch';
import {
  ENTRANCE_TIMING_CONFIG,
  SLOW_DURATION,
  BUTTON_SPRING_CONFIG,
  getStaggeredDelay,
} from '../../src/utils/animations';
import {
  wp,
  hp,
  fontSize,
  spacing,
  useResponsiveDimensions,
  isTablet,
} from '../../src/utils/responsive';
import { ReviewList } from '../../src/components/ReviewList';
import { ReviewForm } from '../../src/components/ReviewForm';
import { ReviewSummary } from '../../src/components/ReviewSummary';
import { Review, ReviewFormData } from '../../src/models/Review';

// Dados simulados do produto
const produtosMock = {
  '1': {
    id: '1',
    nome: 'Bolo de Chocolate',
    descricao: 'Delicioso bolo de chocolate com cobertura especial e recheio cremoso.',
    categoria: 'Bolos',
    preco: 90.0,
    imagem: 'https://via.placeholder.com/400x300',
    avaliacoes: [
      {
        id: '1',
        usuario: 'Maria S.',
        data: '2024-02-15',
        nota: 5,
        comentario: 'O melhor bolo que já provei! A cobertura é incrível.',
      },
      {
        id: '2',
        usuario: 'João P.',
        data: '2024-02-20',
        nota: 4,
        comentario: 'Muito bom, mas poderia ter mais recheio.',
      },
    ],
    ingredientes: [
      'Farinha de trigo',
      'Chocolate em pó',
      'Açúcar',
      'Ovos',
      'Leite',
      'Manteiga',
      'Fermento em pó',
    ],
    informacoesAdicionais: 'Contém glúten e lactose. Pode conter traços de nozes.',
    tempoPreparacao: '2 dias úteis',
    opcoes: [
      { id: '1', nome: 'Cobertura Extra', preco: 10.0 },
      { id: '2', nome: 'Decoração Personalizada', preco: 20.0 },
      { id: '3', nome: 'Versão Sem Lactose', preco: 15.0 },
    ],
  },
  '2': {
    id: '2',
    nome: 'Bolo de Morango',
    descricao: 'Bolo leve de baunilha com camadas de morangos frescos e chantilly.',
    categoria: 'Bolos',
    preco: 85.0,
    imagem: 'https://via.placeholder.com/400x300',
    avaliacoes: [
      {
        id: '1',
        usuario: 'Ana C.',
        data: '2024-03-05',
        nota: 5,
        comentario: 'Os morangos estavam muito frescos. Adorei!',
      },
      {
        id: '2',
        usuario: 'Carlos M.',
        data: '2024-03-10',
        nota: 5,
        comentario: 'Perfeito para minha festa de aniversário.',
      },
      {
        id: '3',
        usuario: 'Lucia F.',
        data: '2024-03-15',
        nota: 4,
        comentario: 'Muito saboroso, mas achei um pouco doce demais.',
      },
    ],
    ingredientes: [
      'Farinha de trigo',
      'Açúcar',
      'Ovos',
      'Leite',
      'Manteiga',
      'Essência de baunilha',
      'Morangos frescos',
      'Creme de leite fresco',
      'Fermento em pó',
    ],
    informacoesAdicionais: 'Contém glúten e lactose.',
    tempoPreparacao: '2 dias úteis',
    opcoes: [
      { id: '1', nome: 'Mais morangos', preco: 10.0 },
      { id: '2', nome: 'Calda extra', preco: 8.0 },
    ],
  },
};

export default function DetalhesProduto() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [produto, setProduto] = useState(null);
  const [novaAvaliacao, setNovaAvaliacao] = useState({
    nota: 0,
    comentario: '',
    mostrando: false,
  });
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState([]);
  const [notaMedia, setNotaMedia] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Usar dimensões responsivas para ajustar quando a orientação mudar
  const dimensions = useResponsiveDimensions();
  const isLandscape = dimensions.width > dimensions.height;

  // Animated values
  const headerOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const ratingScale = useSharedValue(0);
  const formHeight = useSharedValue(0);
  const commentFormY = useSharedValue(100);
  const searchIconScale = useSharedValue(1);

  // Efeito para carregar dados do produto
  useEffect(() => {
    // Simulando uma chamada de API
    setTimeout(() => {
      const produtoData = produtosMock[id];
      setProduto(produtoData);

      // Calcular nota média
      if (produtoData && produtoData.avaliacoes.length > 0) {
        const soma = produtoData.avaliacoes.reduce((acc, curr) => acc + curr.nota, 0);
        setNotaMedia(soma / produtoData.avaliacoes.length);
      }

      setIsLoading(false);

      // Animar entrada dos elementos
      headerOpacity.value = withTiming(1, { ...ENTRANCE_TIMING_CONFIG, duration: 600 });
      contentOpacity.value = withTiming(1, {
        ...ENTRANCE_TIMING_CONFIG,
        duration: 800,
        delay: 200,
      });
      scale.value = withSpring(1, BUTTON_SPRING_CONFIG);
      ratingScale.value = withTiming(1, { duration: 800, easing: Easing.elastic(1.5) });
    }, 1000);
  }, [id]);

  // Estilos animados
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ratingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ratingScale.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    height: formHeight.value,
    overflow: 'hidden',
  }));

  const commentFormAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: commentFormY.value }],
  }));

  const searchIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchIconScale.value }],
  }));

  // Alternar exibição do formulário de avaliação
  const toggleFormAvaliacao = () => {
    if (novaAvaliacao.mostrando) {
      // Animação para fechar o formulário
      commentFormY.value = withTiming(100, { duration: 300 });
      formHeight.value = withTiming(0, { duration: 300 });

      setTimeout(() => {
        setNovaAvaliacao({ ...novaAvaliacao, mostrando: false });
      }, 300);
    } else {
      setNovaAvaliacao({ ...novaAvaliacao, mostrando: true });

      // Animação para abrir o formulário
      // Altura ajustada para tamanhos de tela maiores
      const formHeightValue = isTablet() ? hp(200) : hp(220);
      formHeight.value = withTiming(formHeightValue, { duration: 300 });
      commentFormY.value = withTiming(0, { duration: 300 });
    }
  };

  // Adicionar ou remover uma opção
  const toggleOpcao = opcaoId => {
    if (opcoesSelecionadas.includes(opcaoId)) {
      setOpcoesSelecionadas(opcoesSelecionadas.filter(id => id !== opcaoId));
    } else {
      setOpcoesSelecionadas([...opcoesSelecionadas, opcaoId]);
    }

    // Animação de pulso em escala para o elemento
    scale.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );
  };

  // Calcular o preço total com as opções selecionadas
  const calcularPrecoTotal = () => {
    if (!produto) return 0;

    let total = produto.preco;

    opcoesSelecionadas.forEach(opcaoId => {
      const opcao = produto.opcoes.find(o => o.id === opcaoId);
      if (opcao) {
        total += opcao.preco;
      }
    });

    return total;
  };

  // Enviar nova avaliação
  const enviarAvaliacao = (formData: ReviewFormData) => {
    if (formData.rating === 0 || !formData.comment.trim()) {
      // Poderia exibir uma mensagem de erro aqui
      return;
    }

    // Simulação de envio para a API
    const novaAvaliacaoObj: Review = {
      id: Date.now().toString(),
      userId: 'user-' + Date.now(),
      userName: 'Você',
      productId: id as string,
      rating: formData.rating,
      comment: formData.comment,
      date: new Date().toISOString().split('T')[0],
      likes: 0,
    };

    // Atualizar o produto com a nova avaliação
    const avaliacoes = [...produto.avaliacoes, novaAvaliacaoObj];
    setProduto({ ...produto, avaliacoes });

    // Recalcular a nota média
    const soma = avaliacoes.reduce((acc, curr) => acc + curr.nota, 0);
    setNotaMedia(soma / avaliacoes.length);

    // Animar a transição
    ratingScale.value = withSequence(
      withTiming(1.1, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );

    // Fechar o formulário
    setShowReviewForm(false);

    // Esconder o teclado
    Keyboard.dismiss();
  };

  const handleLikeReview = (reviewId: string) => {
    // Simulação de curtir uma avaliação
    const avaliacoesAtualizadas = produto.avaliacoes.map(av => {
      if (av.id === reviewId) {
        return { ...av, likes: (av.likes || 0) + 1 };
      }
      return av;
    });

    setProduto({ ...produto, avaliacoes: avaliacoesAtualizadas });
  };

  // Lidar com o resultado da busca por voz
  const handleVoiceSearchResult = text => {
    // Animar o ícone de busca
    searchIconScale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );

    // Navegar para a página de produtos com o termo de busca
    router.push({
      pathname: '/produtos',
      params: { search: text },
    });
  };

  // Layout especial para tablets na horizontal ou telas maiores
  const renderTabletLayout = () => (
    <View style={styles.tabletContainer}>
      <Animated.View style={[styles.tabletImageContainer, { opacity: contentOpacity.value }]}>
        <Animated.Image
          source={{ uri: produto.imagem }}
          style={styles.tabletProdutoImagem}
          entering={FadeIn.duration(600)}
        />
      </Animated.View>

      <Animated.View style={[styles.tabletContentContainer, contentAnimatedStyle]}>
        {/* Conteúdo do produto */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.produtoNome}>{produto.nome}</Text>

          <View style={styles.ratingContainer}>
            <Animated.View style={ratingAnimatedStyle}>
              <StarRating rating={notaMedia} size={20} />
            </Animated.View>
            <Text style={styles.ratingText}>
              {notaMedia.toFixed(1)} ({produto.avaliacoes.length}{' '}
              {produto.avaliacoes.length === 1 ? 'avaliação' : 'avaliações'})
            </Text>
          </View>

          <Text style={styles.produtoPreco}>R$ {produto.preco.toFixed(2)}</Text>

          {/* Resto do conteúdo */}
          {/* ... */}
        </ScrollView>
      </Animated.View>
    </View>
  );

  // Adicionar esta função antes do return
  const renderAvaliacoesSection = () => (
    <Card variant="elevated" style={styles.card}>
      <Animated.View
        style={styles.avaliacaoHeader}
        entering={FadeInDown.delay(
          getStaggeredDelay(produto.ingredientes.length + produto.opcoes.length + 9)
        ).duration(400)}
      >
        <Text style={styles.sectionTitle}>Avaliações</Text>
        <View style={styles.avaliacaoActionButtons}>
          <TouchableOpacity
            style={styles.addAvaliacaoBtn}
            onPress={() => setShowReviewForm(!showReviewForm)}
          >
            <Text style={styles.addAvaliacaoBtnText}>
              {showReviewForm ? 'Cancelar' : 'Avaliar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.verTodasBtn}
            onPress={() => router.push(`/avaliacoes/${produto.id}`)}
          >
            <Text style={styles.verTodasBtnText}>Ver todas</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Resumo das avaliações */}
      <Animated.View
        entering={FadeInDown.delay(
          getStaggeredDelay(produto.ingredientes.length + produto.opcoes.length + 10)
        ).duration(400)}
      >
        <ReviewSummary
          averageRating={notaMedia}
          totalReviews={produto.avaliacoes.length}
          style={styles.reviewSummary}
        />
      </Animated.View>

      {/* Formulário de avaliação */}
      <ReviewForm
        onSubmit={enviarAvaliacao}
        onCancel={() => setShowReviewForm(false)}
        isVisible={showReviewForm}
        style={styles.reviewForm}
      />

      {/* Lista de avaliações (limitada) */}
      <Animated.View
        entering={FadeInDown.delay(
          getStaggeredDelay(produto.ingredientes.length + produto.opcoes.length + 11)
        ).duration(400)}
      >
        <ReviewList
          reviews={produto.avaliacoes.slice(0, 3).map(av => ({
            id: av.id,
            userId: av.id, // Simulado
            userName: av.usuario,
            productId: produto.id,
            rating: av.nota,
            comment: av.comentario,
            date: av.data,
            likes: av.likes || 0,
          }))}
          onLikeReview={handleLikeReview}
          emptyMessage="Este produto ainda não possui avaliações. Seja o primeiro a avaliar!"
          style={styles.reviewList}
        />

        {produto.avaliacoes.length > 3 && (
          <TouchableOpacity
            style={styles.verMaisBtn}
            onPress={() => router.push(`/avaliacoes/${produto.id}`)}
          >
            <Text style={styles.verMaisBtnText}>
              Ver todas as {produto.avaliacoes.length} avaliações
            </Text>
          </TouchableOpacity>
        )}

        {produto.avaliacoes.length > 0 && produto.avaliacoes.length <= 3 && (
          <TouchableOpacity
            style={styles.verMaisBtn}
            onPress={() => router.push(`/avaliacoes/${produto.id}`)}
          >
            <Text style={styles.verMaisBtnText}>Ver detalhes das avaliações</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LoadingSpinner type="spinner" size="large" color="#3498db" overlay={false} />
        <Animated.Text style={styles.loadingText} entering={FadeIn.delay(400).duration(400)}>
          Carregando detalhes do produto...
        </Animated.Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>

          <Animated.View
            style={[styles.voiceSearchContainer, searchIconAnimatedStyle]}
            entering={FadeIn.delay(500).duration(300)}
          >
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
          </Animated.View>
        </View>
      </Animated.View>

      {isTablet() && isLandscape ? (
        renderTabletLayout()
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={contentAnimatedStyle}>
            {/* Imagem do produto */}
            <Animated.Image
              source={{ uri: produto.imagem }}
              style={styles.produtoImagem}
              entering={FadeIn.duration(600)}
            />

            {/* Informações básicas */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text style={styles.produtoNome}>{produto.nome}</Text>

              <View style={styles.ratingContainer}>
                <Animated.View style={ratingAnimatedStyle}>
                  <StarRating rating={notaMedia} size={20} />
                </Animated.View>
                <Text style={styles.ratingText}>
                  {notaMedia.toFixed(1)} ({produto.avaliacoes.length}{' '}
                  {produto.avaliacoes.length === 1 ? 'avaliação' : 'avaliações'})
                </Text>
              </View>

              <Text style={styles.produtoPreco}>R$ {produto.preco.toFixed(2)}</Text>
            </Animated.View>

            {/* Descrição */}
            <Card variant="outlined" style={styles.card}>
              <Animated.Text
                style={styles.sectionTitle}
                entering={FadeInDown.delay(getStaggeredDelay(1)).duration(400)}
              >
                Descrição
              </Animated.Text>

              <Animated.Text
                style={styles.descricaoTexto}
                entering={FadeInDown.delay(getStaggeredDelay(2)).duration(400)}
              >
                {produto.descricao}
              </Animated.Text>
            </Card>

            {/* Ingredientes */}
            <Card variant="outlined" style={styles.card}>
              <Animated.Text
                style={styles.sectionTitle}
                entering={FadeInDown.delay(getStaggeredDelay(3)).duration(400)}
              >
                Ingredientes
              </Animated.Text>

              {produto.ingredientes.map((ingrediente, index) => (
                <Animated.View
                  key={index}
                  style={styles.ingredienteItem}
                  entering={FadeInDown.delay(getStaggeredDelay(index + 4)).duration(400)}
                >
                  <Text style={styles.ingredienteTexto}>• {ingrediente}</Text>
                </Animated.View>
              ))}
            </Card>

            {/* Opções adicionais */}
            <Card variant="elevated" style={styles.card}>
              <Animated.Text
                style={styles.sectionTitle}
                entering={FadeInDown.delay(
                  getStaggeredDelay(produto.ingredientes.length + 4)
                ).duration(400)}
              >
                Opções Adicionais
              </Animated.Text>

              {produto.opcoes.map((opcao, index) => (
                <Animated.View
                  key={opcao.id}
                  entering={FadeInDown.delay(
                    getStaggeredDelay(produto.ingredientes.length + index + 5)
                  ).duration(400)}
                >
                  <TouchableOpacity
                    style={[
                      styles.opcaoItem,
                      opcoesSelecionadas.includes(opcao.id) && styles.opcaoSelecionada,
                    ]}
                    onPress={() => toggleOpcao(opcao.id)}
                  >
                    <View style={styles.opcaoCheck}>
                      {opcoesSelecionadas.includes(opcao.id) && (
                        <View style={styles.opcaoCheckInner} />
                      )}
                    </View>
                    <View style={styles.opcaoInfo}>
                      <Text style={styles.opcaoNome}>{opcao.nome}</Text>
                      <Text style={styles.opcaoPreco}>+ R$ {opcao.preco.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}

              {opcoesSelecionadas.length > 0 && (
                <Animated.View
                  style={styles.precoTotalContainer}
                  entering={FadeInDown.delay(
                    getStaggeredDelay(produto.ingredientes.length + produto.opcoes.length + 5)
                  ).duration(400)}
                >
                  <Text style={styles.precoTotalLabel}>Preço Total:</Text>
                  <Text style={styles.precoTotalValor}>R$ {calcularPrecoTotal().toFixed(2)}</Text>
                </Animated.View>
              )}
            </Card>

            {/* Informações adicionais */}
            <Card variant="outlined" style={styles.card}>
              <Animated.Text
                style={styles.sectionTitle}
                entering={FadeInDown.delay(
                  getStaggeredDelay(produto.ingredientes.length + produto.opcoes.length + 6)
                ).duration(400)}
              >
                Informações Adicionais
              </Animated.Text>

              <Animated.Text
                style={styles.infoAdicionalTexto}
                entering={FadeInDown.delay(
                  getStaggeredDelay(produto.ingredientes.length + produto.opcoes.length + 7)
                ).duration(400)}
              >
                {produto.informacoesAdicionais}
              </Animated.Text>

              <Animated.View
                style={styles.tempoContainer}
                entering={FadeInDown.delay(
                  getStaggeredDelay(produto.ingredientes.length + produto.opcoes.length + 8)
                ).duration(400)}
              >
                <Text style={styles.tempoLabel}>Tempo de Preparação:</Text>
                <Text style={styles.tempoValor}>{produto.tempoPreparacao}</Text>
              </Animated.View>
            </Card>

            {/* Avaliações */}
            {renderAvaliacoesSection()}
          </Animated.View>
        </ScrollView>
      )}

      {/* Botões de ação */}
      <Animated.View style={styles.buttonContainer} entering={SlideInUp.delay(600).duration(500)}>
        <Button
          title="Adicionar ao Carrinho"
          onPress={() => {
            // Implementação futura
            router.push('/pedidos');
          }}
          variant="primary"
          style={styles.button}
        />
      </Animated.View>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    padding: spacing(8),
  },
  backButtonText: {
    fontSize: fontSize(16),
    color: '#3498db',
    fontWeight: '500',
  },
  voiceSearchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceSearch: {
    marginRight: spacing(4),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(100), // Espaço para os botões
  },
  produtoImagem: {
    width: '100%',
    height: hp(250),
    resizeMode: 'cover',
    borderRadius: wp(8),
  },
  produtoNome: {
    fontSize: fontSize(24),
    fontWeight: 'bold',
    color: '#333',
    marginTop: spacing(16),
    marginHorizontal: spacing(16),
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(8),
    marginHorizontal: spacing(16),
  },
  ratingText: {
    fontSize: fontSize(14),
    color: '#666',
    marginLeft: spacing(8),
  },
  produtoPreco: {
    fontSize: fontSize(22),
    fontWeight: 'bold',
    color: '#3498db',
    marginTop: spacing(8),
    marginHorizontal: spacing(16),
  },
  card: {
    margin: spacing(16),
    marginTop: spacing(12),
    marginBottom: spacing(12),
  },
  sectionTitle: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(12),
  },
  descricaoTexto: {
    fontSize: fontSize(16),
    color: '#444',
    lineHeight: fontSize(22),
  },
  ingredienteItem: {
    marginBottom: spacing(6),
  },
  ingredienteTexto: {
    fontSize: fontSize(15),
    color: '#444',
    lineHeight: fontSize(20),
  },
  opcaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(10),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  opcaoSelecionada: {
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
  },
  opcaoCheck: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    borderWidth: 2,
    borderColor: '#3498db',
    marginRight: spacing(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoCheckInner: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: '#3498db',
  },
  opcaoInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opcaoNome: {
    fontSize: fontSize(16),
    color: '#333',
  },
  opcaoPreco: {
    fontSize: fontSize(15),
    color: '#3498db',
    fontWeight: '500',
  },
  precoTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing(16),
    marginTop: spacing(10),
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  precoTotalLabel: {
    fontSize: fontSize(16),
    fontWeight: 'bold',
    color: '#333',
  },
  precoTotalValor: {
    fontSize: fontSize(16),
    fontWeight: 'bold',
    color: '#3498db',
  },
  infoAdicionalTexto: {
    fontSize: fontSize(15),
    color: '#444',
    lineHeight: fontSize(20),
    marginBottom: spacing(12),
  },
  tempoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing(8),
    paddingTop: spacing(8),
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tempoLabel: {
    fontSize: fontSize(15),
    color: '#333',
  },
  tempoValor: {
    fontSize: fontSize(15),
    fontWeight: '500',
    color: '#333',
  },
  avaliacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(12),
  },
  avaliacaoActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addAvaliacaoBtn: {
    paddingVertical: spacing(6),
    paddingHorizontal: spacing(12),
    backgroundColor: '#f1f1f1',
    borderRadius: wp(16),
  },
  addAvaliacaoBtnText: {
    fontSize: fontSize(14),
    color: '#3498db',
    fontWeight: '500',
  },
  verTodasBtn: {
    paddingVertical: spacing(6),
    paddingHorizontal: spacing(12),
    backgroundColor: '#f1f1f1',
    borderRadius: wp(16),
    marginLeft: spacing(8),
  },
  verTodasBtnText: {
    fontSize: fontSize(14),
    color: '#3498db',
    fontWeight: '500',
  },
  verMaisBtn: {
    alignSelf: 'center',
    marginTop: spacing(16),
    paddingVertical: spacing(10),
    paddingHorizontal: spacing(16),
    backgroundColor: '#f5f5f5',
    borderRadius: wp(16),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verMaisBtnText: {
    fontSize: fontSize(14),
    color: '#3498db',
    fontWeight: '500',
    textAlign: 'center',
  },
  formContainer: {
    overflow: 'hidden',
  },
  avaliacaoForm: {
    marginBottom: spacing(16),
    paddingVertical: spacing(12),
    backgroundColor: '#f5f5f5',
    borderRadius: wp(8),
    padding: spacing(16),
  },
  formLabel: {
    fontSize: fontSize(14),
    fontWeight: '500',
    color: '#333',
    marginBottom: spacing(4),
  },
  commentInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: wp(8),
    padding: spacing(10),
    minHeight: hp(80),
    textAlignVertical: 'top',
    marginBottom: spacing(12),
  },
  submitButton: {
    marginTop: spacing(8),
  },
  avaliacaoItem: {
    marginBottom: spacing(16),
    paddingBottom: spacing(16),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avaliacaoUsuario: {
    fontSize: fontSize(15),
    fontWeight: '600',
    color: '#333',
  },
  avaliacaoData: {
    fontSize: fontSize(13),
    color: '#888',
  },
  avaliacaoComentario: {
    fontSize: fontSize(14),
    color: '#444',
    marginTop: spacing(8),
    lineHeight: fontSize(20),
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing(16),
    backgroundColor: 'rgba(249, 249, 249, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    width: '100%',
  },
  // Estilos específicos para tablet em modo paisagem
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingBottom: hp(80), // Espaço para botão
  },
  tabletImageContainer: {
    width: '40%',
    padding: spacing(16),
  },
  tabletContentContainer: {
    width: '60%',
    padding: spacing(16),
    paddingLeft: 0,
  },
  tabletProdutoImagem: {
    width: '100%',
    height: '80%',
    resizeMode: 'cover',
    borderRadius: wp(8),
  },
  reviewSummary: {
    marginBottom: spacing(16),
  },
  reviewForm: {
    marginBottom: spacing(16),
  },
  reviewList: {
    marginTop: spacing(8),
  },
});
