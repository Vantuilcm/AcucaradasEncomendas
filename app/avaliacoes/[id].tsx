import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
  Layout,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '../../src/components/base/Card';
import { Button } from '../../src/components/base/Button';
import { LoadingSpinner } from '../../src/components/Loading';
import { ReviewList } from '../../src/components/ReviewList';
import { ReviewSummary } from '../../src/components/ReviewSummary';
import { Review, ReviewFilters } from '../../src/types/Review';
import { ReviewService } from '../../src/services/ReviewService';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { SocialAuthService } from '../../src/services/SocialAuthService';
import { TwoFactorAuthService } from '../../src/services/TwoFactorAuthService';
import {
  ENTRANCE_TIMING_CONFIG,
  SLOW_DURATION,
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
        comentario:
          'O melhor bolo que já provei! A cobertura é incrível. Já comprei outras vezes e sempre fica ótimo. Recomendo!',
      },
      {
        id: '2',
        usuario: 'João P.',
        data: '2024-02-20',
        nota: 4,
        comentario:
          'Muito bom, mas poderia ter mais recheio. A massa ficou no ponto e a entrega foi rápida.',
      },
      {
        id: '3',
        usuario: 'Ana C.',
        data: '2024-01-10',
        nota: 5,
        comentario:
          'Perfeito para minha festa de aniversário. Todo mundo elogiou o sabor e a aparência. Com certeza vou pedir novamente.',
      },
      {
        id: '4',
        usuario: 'Ricardo M.',
        data: '2024-01-05',
        nota: 3,
        comentario:
          'Achei um pouco seco, mas o sabor estava bom. Talvez o tempo de entrega afetou a qualidade.',
      },
      {
        id: '5',
        usuario: 'Fernanda L.',
        data: '2023-12-20',
        nota: 5,
        comentario:
          'Superei minhas expectativas! A textura e o sabor estavam perfeitos. O atendimento também foi excelente.',
      },
    ],
    notaMedia: 4.4,
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
      {
        id: '4',
        usuario: 'Marcos T.',
        data: '2024-02-28',
        nota: 5,
        comentario: 'Os morangos eram de ótima qualidade. O bolo ficou lindo e delicioso.',
      },
      {
        id: '5',
        usuario: 'Paula S.',
        data: '2024-02-15',
        nota: 4,
        comentario:
          'Massa bem fofinha, decoração impecável. Só achei que poderia ter mais morangos no recheio.',
      },
      {
        id: '6',
        usuario: 'Roberto G.',
        data: '2024-02-10',
        nota: 3,
        comentario: 'Bom, mas esperava mais pelo preço cobrado. Achei os morangos um pouco ácidos.',
      },
    ],
    notaMedia: 4.3,
  },
};

// Opções de ordenação
const opcoesFiltro = [
  { id: 'newest', label: 'Mais recentes' },
  { id: 'highest', label: 'Maior nota' },
  { id: 'lowest', label: 'Menor nota' },
  { id: 'mostLiked', label: 'Mais curtidos' },
];

export default function AvaliacoesProduto() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [produto, setProduto] = useState(null);
  const [filtroAtual, setFiltroAtual] = useState<ReviewFilters['sortBy']>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [avaliacoes, setAvaliacoes] = useState<Review[]>([]);
  const [avaliacoesFiltradas, setAvaliacoesFiltradas] = useState<Review[]>([]);
  const [lastReview, setLastReview] = useState<Review | null>(null);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [filtroNota, setFiltroNota] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumo, setResumo] = useState<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution?: Record<number, number>;
  } | null>(null);

  // Estados para autenticação
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMethod, setAuthMethod] = useState<'google' | 'facebook' | 'apple' | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [is2FAModalVisible, setIs2FAModalVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Serviços de autenticação
  const socialAuthService = useMemo(() => new SocialAuthService(), []);
  const twoFactorAuthService = useMemo(() => new TwoFactorAuthService(), []);

  // Animated values
  const headerOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const searchBarOpacity = useSharedValue(0);
  const searchInputScale = useSharedValue(1);
  const filterScale = useSharedValue(1);
  const filterTranslateY = useSharedValue(0);
  const authModalScale = useSharedValue(0.9);
  const authModalOpacity = useSharedValue(0);

  // Verificar status de autenticação
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Verificar se o usuário está autenticado pelo token armazenado
        const userToken = await AsyncStorage.getItem('userToken');
        setIsAuthenticated(!!userToken);

        // Se autenticado, verificar se o 2FA está habilitado
        if (userToken) {
          const twoFAEnabled = await twoFactorAuthService.is2FAEnabled();
          setIs2FAEnabled(twoFAEnabled);
        }
      } catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
      }
    };

    checkAuthStatus();
  }, []);

  // Carregar dados do produto
  const loadReviews = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setIsRefreshing(true);
        } else if (!isRefreshing) {
          setIsLoading(true);
        }

        setError(null);

        const reviewService = new ReviewService();
        const filters: ReviewFilters = {
          sortBy: filtroAtual,
        };

        if (filtroNota !== null) {
          filters.rating = filtroNota;
        }

        const reviewsData = await reviewService.getReviews(filters, refresh ? null : lastReview);

        // Se não for carregamento de mais itens, buscar resumo
        if (refresh || isLoading) {
          const summaryData = await reviewService.getReviewSummary();

          setResumo({
            averageRating: summaryData.averageRating,
            totalReviews: summaryData.totalReviews,
          });
        }

        if (refresh) {
          setAvaliacoes(reviewsData);
        } else {
          setAvaliacoes(prev => [...prev, ...reviewsData]);
        }

        // Filtra apenas por busca, pois os outros filtros já são aplicados na API
        const filtered = searchQuery
          ? reviewsData.filter(av => av.comment.toLowerCase().includes(searchQuery.toLowerCase()))
          : reviewsData;

        if (refresh) {
          setAvaliacoesFiltradas(filtered);
        } else {
          setAvaliacoesFiltradas(prev => [...prev, ...filtered]);
        }

        // Atualizar último review para paginação
        setLastReview(reviewsData.length > 0 ? reviewsData[reviewsData.length - 1] : null);
        setHasMoreReviews(reviewsData.length > 0);

        // Buscar informações do produto (nome)
        try {
          // Em um ambiente real, você chamaria uma API de produtos aqui
          // Por enquanto vamos manter o mockup apenas para o nome do produto
          setProduto({
            id: id as string,
            nome: id === '1' ? 'Bolo de Chocolate' : 'Bolo de Morango',
          });
        } catch (produtoError) {
          console.error('Erro ao carregar produto:', produtoError);
        }

        // Animar entrada dos elementos
        if (!isRefreshing && isLoading) {
          headerOpacity.value = withTiming(1, { ...ENTRANCE_TIMING_CONFIG, duration: 600 });
          contentOpacity.value = withTiming(1, {
            ...ENTRANCE_TIMING_CONFIG,
            duration: 800,
            delay: 200,
          });
          searchBarOpacity.value = withTiming(1, {
            ...ENTRANCE_TIMING_CONFIG,
            duration: 600,
            delay: 300,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar avaliações');
        console.error('Erro ao carregar avaliações:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [id, filtroAtual, filtroNota, lastReview, searchQuery, isRefreshing, isLoading]
  );

  // Carregar dados iniciais
  useEffect(() => {
    loadReviews(true);
  }, []);

  // Aplicar filtros
  const aplicarFiltros = useCallback(() => {
    // Animar a mudança
    filterScale.value = withSequence(
      withTiming(0.95, { duration: 150 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );

    filterTranslateY.value = withSequence(
      withTiming(10, { duration: 150 }),
      withTiming(0, { duration: 300 })
    );

    contentOpacity.value = withSequence(
      withTiming(0.7, { duration: 150 }),
      withTiming(1, { duration: 300 })
    );

    // Reset para carregar dados do início
    setLastReview(null);
    setHasMoreReviews(true);

    // Carregar novos dados com os filtros aplicados
    loadReviews(true);
  }, [loadReviews]);

  // Alterar filtro ativo
  const handleChangeFiltro = (filtroId: ReviewFilters['sortBy']) => {
    if (filtroId === filtroAtual) return;

    setFiltroAtual(filtroId);
    aplicarFiltros();
  };

  // Filtrar por busca
  const handleSearch = (texto: string) => {
    setSearchQuery(texto);

    // Se a busca for vazia, simplesmente usamos os resultados da API
    if (!texto.trim()) {
      setAvaliacoesFiltradas(avaliacoes);
      return;
    }

    // Filtrar localmente por texto
    const query = texto.toLowerCase();
    const filtered = avaliacoes.filter(av => av.comment.toLowerCase().includes(query));

    setAvaliacoesFiltradas(filtered);

    // Animar a barra de busca
    searchInputScale.value = withSequence(
      withTiming(1.03, { duration: 150 }),
      withTiming(1, { duration: 200 })
    );
  };

  // Filtrar por nota
  const handleFiltroNota = (nota: number) => {
    const novoFiltro = filtroNota === nota ? null : nota;
    setFiltroNota(novoFiltro);
    aplicarFiltros();
  };

  // Mostrar modal de autenticação
  const showAuthModal = () => {
    setAuthError(null);
    setIsAuthModalVisible(true);

    // Animar a entrada do modal
    authModalOpacity.value = withTiming(1, { duration: 300 });
    authModalScale.value = withTiming(1, {
      duration: 400,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  };

  // Esconder modal de autenticação
  const hideAuthModal = () => {
    authModalOpacity.value = withTiming(0, { duration: 200 });
    authModalScale.value = withTiming(0.9, { duration: 200 });

    setTimeout(() => {
      setIsAuthModalVisible(false);
      setAuthMethod(null);
      setVerificationCode('');
    }, 250);
  };

  // Realizar login com provedor social
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      setAuthMethod(provider);
      setAuthError(null);

      let result: SocialAuthResult;

      switch (provider) {
        case 'google':
          result = await socialAuthService.signInWithGoogle();
          break;
        case 'facebook':
          result = await socialAuthService.signInWithFacebook();
          break;
        case 'apple':
          result = await socialAuthService.signInWithApple();
          break;
        default:
          throw new Error('Provedor de autenticação inválido');
      }

      if (result.success) {
        setIsAuthenticated(true);

        // Verificar se o 2FA está habilitado
        const twoFAEnabled = await twoFactorAuthService.is2FAEnabled();
        setIs2FAEnabled(twoFAEnabled);

        if (twoFAEnabled) {
          // Enviar código de verificação e mostrar modal 2FA
          await twoFactorAuthService.generateAndSendVerificationCode();
          setIs2FAModalVisible(true);
        } else {
          // Se não tiver 2FA, fechar modal de autenticação
          hideAuthModal();
        }
      } else {
        setAuthError(result.error || 'Falha na autenticação');
      }
    } catch (error) {
      console.error(`Erro ao fazer login com ${provider}:`, error);
      setAuthError(error instanceof Error ? error.message : 'Erro ao realizar autenticação');
    }
  };

  // Verificar código 2FA
  const handleVerifyCode = async () => {
    try {
      setAuthError(null);

      if (!verificationCode || verificationCode.length < 6) {
        setAuthError('Código de verificação inválido');
        return;
      }

      const result = await twoFactorAuthService.verifyCode(verificationCode);

      if (result.success) {
        setIs2FAModalVisible(false);
        hideAuthModal();
      } else {
        setAuthError(result.error || 'Código inválido');
      }
    } catch (error) {
      console.error('Erro ao verificar código 2FA:', error);
      setAuthError(error instanceof Error ? error.message : 'Erro ao verificar código');
    }
  };

  // Dar like em uma avaliação
  const handleLikeReview = async (reviewId: string) => {
    try {
      // Verificar se o usuário está autenticado
      if (!isAuthenticated) {
        showAuthModal();
        return;
      }

      const reviewService = new ReviewService();
      await reviewService.likeReview(reviewId);

      // Atualizar a lista local
      const updatedAvaliacoes = avaliacoes.map(av => {
        if (av.id === reviewId) {
          return { ...av, likes: (av.likes || 0) + 1 };
        }
        return av;
      });

      setAvaliacoes(updatedAvaliacoes);

      // Atualizar a lista filtrada
      const updatedFiltradas = avaliacoesFiltradas.map(av => {
        if (av.id === reviewId) {
          return { ...av, likes: (av.likes || 0) + 1 };
        }
        return av;
      });

      setAvaliacoesFiltradas(updatedFiltradas);
    } catch (err) {
      console.error('Erro ao curtir avaliação:', err);
      setError('Não foi possível curtir esta avaliação. Tente novamente mais tarde.');
    }
  };

  // Carregar mais avaliações
  const handleLoadMore = () => {
    if (!hasMoreReviews || isLoadingMore) return;

    setIsLoadingMore(true);
    loadReviews();
  };

  // Estilos animados
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: searchBarOpacity.value,
  }));

  const searchInputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchInputScale.value }],
  }));

  const filterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: filterScale.value }, { translateY: filterTranslateY.value }],
  }));

  const authModalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: authModalOpacity.value,
    transform: [{ scale: authModalScale.value }],
  }));

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LoadingSpinner type="spinner" size="large" color="#3498db" overlay={false} />
        <Animated.Text style={styles.loadingText} entering={FadeIn.delay(400).duration(400)}>
          Carregando avaliações...
        </Animated.Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <Animated.Text style={styles.title} entering={FadeIn.duration(SLOW_DURATION)}>
          Avaliações: {produto?.nome}
        </Animated.Text>
      </Animated.View>

      {/* Barra de busca */}
      <Animated.View style={[styles.searchContainer, searchBarAnimatedStyle]}>
        <Animated.View style={[styles.searchInputContainer, searchInputAnimatedStyle]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar nas avaliações..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </Animated.View>
      </Animated.View>

      {/* Filtros de nota */}
      <Animated.View
        style={[styles.filtroNotasContainer, searchBarAnimatedStyle, filterAnimatedStyle]}
        entering={FadeInDown.delay(400).duration(400)}
        layout={Layout.springify()}
      >
        <Text style={styles.filtroNotasLabel}>Filtrar por nota:</Text>
        <View style={styles.filtroNotasBotoes}>
          {[5, 4, 3, 2, 1].map(nota => (
            <TouchableOpacity
              key={nota}
              style={[styles.filtroNotaBtn, filtroNota === nota && styles.filtroNotaBtnAtivo]}
              onPress={() => handleFiltroNota(nota)}
            >
              <Animated.Text
                style={[styles.filtroNotaText, filtroNota === nota && styles.filtroNotaTextAtivo]}
                layout={Layout.springify()}
              >
                {nota}★
              </Animated.Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Opções de ordenação */}
      <Animated.View
        style={[styles.filtrosContainer, filterAnimatedStyle]}
        entering={FadeInDown.delay(500).duration(400)}
        layout={Layout.springify()}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosScroll}
        >
          {opcoesFiltro.map(opcao => (
            <TouchableOpacity
              key={opcao.id}
              style={[styles.filtroItem, filtroAtual === opcao.id && styles.filtroItemAtivo]}
              onPress={() => handleChangeFiltro(opcao.id)}
            >
              <Animated.Text
                style={[styles.filtroTexto, filtroAtual === opcao.id && styles.filtroTextoAtivo]}
                layout={Layout.springify()}
              >
                {opcao.label}
              </Animated.Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadReviews(true);
            }}
          />
        }
      >
        <Animated.View style={contentAnimatedStyle} entering={FadeInDown.delay(600).duration(400)}>
          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => loadReviews(true)}
              style={styles.errorContainer}
            />
          ) : (
            <>
              {/* Resumo */}
              {resumo && (
                <ReviewSummary
                  averageRating={resumo.averageRating}
                  totalReviews={resumo.totalReviews}
                  style={styles.summaryCard}
                  animated={true}
                />
              )}

              {/* Lista de avaliações filtradas */}
              {avaliacoesFiltradas.length > 0 ? (
                <>
                  <ReviewList
                    reviews={avaliacoesFiltradas.map(av => ({
                      id: av.id,
                      userId: av.userId,
                      userName:
                        av.userId.substring(0, 1).toUpperCase() + av.userId.substring(1, 5) + '...',
                      productId: id as string,
                      rating: av.rating,
                      comment: av.comment,
                      date: new Date(av.createdAt).toLocaleDateString('pt-BR'),
                      likes: av.likes || 0,
                    }))}
                    onLikeReview={handleLikeReview}
                    style={styles.reviewList}
                  />

                  {isLoadingMore && (
                    <View style={styles.loadMoreContainer}>
                      <ActivityIndicator size="small" color="#3498db" />
                      <Text style={styles.loadMoreText}>Carregando mais avaliações...</Text>
                    </View>
                  )}

                  {hasMoreReviews && !isLoadingMore && (
                    <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                      <Text style={styles.loadMoreBtnText}>Carregar mais avaliações</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Nenhuma avaliação encontrada com os filtros atuais.
                  </Text>
                  <Button
                    title="Limpar filtros"
                    onPress={() => {
                      setSearchQuery('');
                      setFiltroNota(null);
                      setFiltroAtual('newest');
                      aplicarFiltros();
                    }}
                    variant="outline"
                    style={styles.clearButton}
                  />
                </View>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal de Autenticação */}
      {isAuthModalVisible && (
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.authModal, authModalAnimatedStyle]}>
            <Text style={styles.authTitle}>
              {is2FAModalVisible ? 'Verificação em duas etapas' : 'Entre para continuar'}
            </Text>

            {authError && <Text style={styles.authError}>{authError}</Text>}

            {!is2FAModalVisible ? (
              <View style={styles.authOptions}>
                <TouchableOpacity
                  style={[styles.authButton, styles.googleButton]}
                  onPress={() => handleSocialLogin('google')}
                  disabled={!!authMethod}
                >
                  <Text style={styles.authButtonText}>Continuar com Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.authButton, styles.facebookButton]}
                  onPress={() => handleSocialLogin('facebook')}
                  disabled={!!authMethod}
                >
                  <Text style={styles.authButtonText}>Continuar com Facebook</Text>
                </TouchableOpacity>

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.authButton, styles.appleButton]}
                    onPress={() => handleSocialLogin('apple')}
                    disabled={!!authMethod}
                  >
                    <Text style={styles.authButtonText}>Continuar com Apple</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={hideAuthModal}>
                  <Text style={styles.closeButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.twoFAContainer}>
                <Text style={styles.twoFAText}>
                  Enviamos um código de verificação para seu email.
                </Text>

                <TextInput
                  style={styles.codeInput}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Digite o código de 6 dígitos"
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <View style={styles.twoFAButtons}>
                  <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyCode}>
                    <Text style={styles.verifyButtonText}>Verificar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIs2FAModalVisible(false);
                      hideAuthModal();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: fontSize(22),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(8),
  },
  searchContainer: {
    paddingHorizontal: spacing(16),
    marginBottom: spacing(12),
  },
  searchInputContainer: {
    marginBottom: spacing(8),
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: wp(8),
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: spacing(16),
    paddingVertical: spacing(10),
    fontSize: fontSize(16),
  },
  filtroNotasContainer: {
    paddingHorizontal: spacing(16),
    marginBottom: spacing(12),
  },
  filtroNotasLabel: {
    fontSize: fontSize(14),
    color: '#666',
    marginBottom: spacing(8),
  },
  filtroNotasBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filtroNotaBtn: {
    paddingHorizontal: spacing(12),
    paddingVertical: spacing(6),
    borderRadius: wp(20),
    backgroundColor: '#f0f0f0',
    marginRight: spacing(8),
  },
  filtroNotaBtnAtivo: {
    backgroundColor: '#3498db',
  },
  filtroNotaText: {
    fontSize: fontSize(14),
    color: '#333',
  },
  filtroNotaTextAtivo: {
    color: '#fff',
    fontWeight: '500',
  },
  filtrosContainer: {
    marginBottom: spacing(16),
  },
  filtrosScroll: {
    paddingHorizontal: spacing(16),
  },
  filtroItem: {
    paddingHorizontal: spacing(16),
    paddingVertical: spacing(8),
    marginRight: spacing(8),
    borderRadius: wp(20),
    backgroundColor: '#f0f0f0',
  },
  filtroItemAtivo: {
    backgroundColor: '#3498db',
  },
  filtroTexto: {
    fontSize: fontSize(14),
    color: '#333',
  },
  filtroTextoAtivo: {
    color: '#fff',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing(16),
    paddingTop: 0,
  },
  summaryCard: {
    marginBottom: spacing(16),
  },
  reviewList: {
    marginTop: spacing(16),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(32),
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
  errorContainer: {
    marginTop: spacing(16),
  },
  loadMoreContainer: {
    alignItems: 'center',
    padding: spacing(16),
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginLeft: spacing(8),
    fontSize: fontSize(14),
    color: '#666',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: spacing(8),
    marginBottom: spacing(16),
    paddingVertical: spacing(10),
    paddingHorizontal: spacing(16),
    backgroundColor: '#f5f5f5',
    borderRadius: wp(16),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadMoreBtnText: {
    fontSize: fontSize(14),
    color: '#3498db',
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  authModal: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: wp(16),
    padding: spacing(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  authTitle: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: spacing(16),
  },
  authError: {
    fontSize: fontSize(14),
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: spacing(16),
    padding: spacing(8),
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: wp(8),
  },
  authOptions: {
    alignItems: 'center',
  },
  authButton: {
    width: '100%',
    padding: spacing(12),
    borderRadius: wp(8),
    marginBottom: spacing(12),
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  facebookButton: {
    backgroundColor: '#3b5998',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  authButtonText: {
    color: '#fff',
    fontSize: fontSize(14),
    fontWeight: '500',
  },
  closeButton: {
    marginTop: spacing(8),
    padding: spacing(8),
  },
  closeButtonText: {
    color: '#666',
    fontSize: fontSize(14),
  },
  twoFAContainer: {
    alignItems: 'center',
  },
  twoFAText: {
    fontSize: fontSize(14),
    color: '#666',
    textAlign: 'center',
    marginBottom: spacing(16),
  },
  codeInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: wp(8),
    padding: spacing(12),
    fontSize: fontSize(18),
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: spacing(16),
  },
  twoFAButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  verifyButton: {
    backgroundColor: '#3498db',
    padding: spacing(12),
    borderRadius: wp(8),
    flex: 1,
    marginRight: spacing(8),
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: fontSize(14),
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
    padding: spacing(12),
    borderRadius: wp(8),
    flex: 1,
    marginLeft: spacing(8),
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: fontSize(14),
    fontWeight: '500',
  },
});
