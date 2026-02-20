import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Share,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { EnhancedImage, PlaceholderType } from '../components/EnhancedImage';
import { ProductRecommendations } from '../components/ProductRecommendations';
import { ProductSocialActions } from '../components/ProductSocialActions';
import { RecommendationService } from '../services/RecommendationService';
import { FeedbackType, Toast, CartAddEffect, FeedbackButton } from '../components/FeedbackEffects';
import * as Haptics from 'expo-haptics';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { product } = (route.params as { product?: import('../types/Product').Product }) || {};

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cartAnimation, setCartAnimation] = useState({
    visible: false,
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 0, y: 0 },
  });
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: FeedbackType.SUCCESS,
  });

  const scrollX = useRef(new Animated.Value(0)).current;
  const addToCartButtonRef = useRef<any>(null);
  const cartButtonRef = useRef({ x: 0, y: 0 });

  const recommendationService = RecommendationService.getInstance();

  // Registrar visualização do produto para recomendações
  useEffect(() => {
    if (!product) return;

    const logProductView = async () => {
      try {
        // O serviço espera apenas o ID do produto e tempo opcional
        await recommendationService.trackProductView(product.id);
      } catch (error) {
        logger.error('Erro ao registrar visualização:', error instanceof Error ? error : new Error(String(error)));
      }
    };

    logProductView();
  }, [product, recommendationService]);

  // Função para adicionar ao carrinho com animação
  const handleAddToCart = async () => {
    if (!product) return;

    // Adicionar ao carrinho com dados esperados pelo CartService
    try {
      await addItem({
        productId: product.id,
        producerId: product.producerId || 'producer_test_123',
        name: product.nome,
        price: product.preco,
        quantity: 1,
        image: (product.imagens && product.imagens.length > 0) ? product.imagens[0] : '',
        options: [],
        notes: '',
      });
    } catch (error) {
      logger.error('Erro ao adicionar ao carrinho:', error instanceof Error ? error : new Error(String(error)));
      showToast('Falha ao adicionar ao carrinho', FeedbackType.ERROR);
      return;
    }

    // Feedback tátil
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Mostrar toast
    showToast('Produto adicionado ao carrinho', FeedbackType.SUCCESS);

    // Calcular posição para animação
    if (addToCartButtonRef.current) {
      (addToCartButtonRef.current as any).measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        const startPosition = {
          x: px + width / 2,
          y: py,
        };

        // Posição do carrinho no header (estimado)
        const endPosition = {
          x: width - 30,
          y: 50,
        };

        // Iniciar animação
        setCartAnimation({
          visible: true,
          startPosition,
          endPosition,
        });
      });
    }
  };

  // Função para exibir toast
  const showToast = (message: string, type: FeedbackType = FeedbackType.SUCCESS) => {
    setToast({
      visible: true,
      message,
      type,
    });

    // Ocultar toast após um tempo
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Finalizar animação do carrinho
  const handleCartAnimationComplete = () => {
    setCartAnimation(prev => ({ ...prev, visible: false }));
  };

  // Função para navegar entre imagens
  const handleImageChange = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Gerenciar notificação após compartilhamento
  const handleAfterShare = () => {
    showToast('Produto compartilhado!', FeedbackType.SUCCESS);
  };

  // Atualizar título da tela com o nome do produto
  useEffect(() => {
    if (product && product.nome) {
      navigation.setOptions({
        title: product.nome,
      });
    }
  }, [navigation, product]);

  // Navegar para detalhes de outro produto
  const handleProductPress = (selectedProduct: import('../types/Product').Product) => {
    // Prefer push to allow back navigation between products
    if (navigation.replace) {
      navigation.replace('ProductDetails', { product: selectedProduct });
    } else {
      navigation.navigate('ProductDetails', { product: selectedProduct });
    }
  };

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Produto não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Carrossel de imagens */}
        <View style={styles.imageCarouselContainer}>
          {product.imagens && product.imagens.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                  useNativeDriver: false,
                })}
                scrollEventThrottle={16}
              >
                {product.imagens.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <EnhancedImage
                      source={{ uri: image }}
                      style={styles.productImage}
                      placeholderType={PlaceholderType.SKELETON}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>

              {/* Indicadores do carrossel */}
              {product.imagens.length > 1 && (
                <View style={styles.paginationContainer}>
                  {product.imagens.map((_, index) => {
                    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

                    const dotWidth = scrollX.interpolate({
                      inputRange,
                      outputRange: [8, 16, 8],
                      extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.3, 1, 0.3],
                      extrapolate: 'clamp',
                    });

                    return (
                      <Animated.View
                        key={index}
                        style={[styles.paginationDot, { width: dotWidth, opacity }]}
                      />
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <EnhancedImage
              source={{ uri: 'https://via.placeholder.com/400x300?text=Sem+Imagem' }}
              style={styles.productImage}
              placeholderType={PlaceholderType.SKELETON}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Informações do produto */}
        <View style={styles.productInfoContainer}>
          <Text style={styles.productName}>{product.nome}</Text>
          <Text style={styles.productPrice}>R$ {product.preco.toFixed(2)}</Text>

          {/* Ações sociais (curtir, compartilhar) */}
          <ProductSocialActions product={product} onShare={handleAfterShare} />

          {/* Descrição do produto */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.descriptionText}>{product.descricao}</Text>
          </View>

          {/* Informações adicionais */}
          {product.detalhes && (
            <View style={styles.detailsContainer}>
              <Text style={styles.sectionTitle}>Detalhes</Text>
              {Object.entries(product.detalhes).map(([key, value]) => (
                <View key={key} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{key}:</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Botão de adicionar ao carrinho */}
          <View style={styles.addToCartContainer} ref={addToCartButtonRef}>
            <FeedbackButton
              onPress={handleAddToCart}
              hapticFeedback={true}
              hapticType="medium"
              style={styles.addToCartButton}
            >
              <Text style={styles.addToCartButtonText}>Adicionar ao Carrinho</Text>
            </FeedbackButton>
          </View>

          {/* Recomendações personalizadas */}
          <ProductRecommendations
            title="Você também pode gostar"
            subtitle="Baseado em suas preferências"
            limit={6}
            onProductPress={handleProductPress}
            recommendationType="viewed"
            cardStyle="compact"
            containerStyle={styles.recommendationsContainer}
          />
        </View>
      </ScrollView>

      {/* Feedback visual: Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* Animação de adição ao carrinho */}
      {cartAnimation.visible && (
        <CartAddEffect
          startPosition={cartAnimation.startPosition}
          endPosition={cartAnimation.endPosition}
          onAnimationComplete={handleCartAnimationComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  imageCarouselContainer: {
    position: 'relative',
    height: 300,
    backgroundColor: '#f8f8f8',
  },
  imageContainer: {
    width: width,
    height: 300,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productInfoContainer: {
    padding: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 16,
  },
  descriptionContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: '40%',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  addToCartContainer: {
    marginVertical: 16,
  },
  addToCartButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recommendationsContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
});
