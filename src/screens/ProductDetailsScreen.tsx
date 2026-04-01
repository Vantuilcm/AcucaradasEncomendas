import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { EnhancedImage, PlaceholderType } from '../components/EnhancedImage';
import { ProductRecommendations } from '../components/ProductRecommendations';
import { ProductSocialActions } from '../components/ProductSocialActions';
import { RecommendationService } from '../services/RecommendationService';
import { FeedbackType, Toast, CartAddEffect, FeedbackButton } from '../components/FeedbackEffects';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { addToCart } = useCart() as any;
  const { user } = useAuth();
  const { product } = route.params as any;

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
  const [modalImageVisible, setModalImageVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const scrollX = useRef(new Animated.Value(0)).current;
  const addToCartButtonRef = useRef(null);

  const recommendationService = RecommendationService.getInstance();

  const handleImagePress = useCallback((uri: string) => {
    try {
      if (uri && uri.startsWith('http')) {
        setSelectedImage(uri);
        setModalImageVisible(true);
      }
    } catch (error) {
      console.error('Erro ao abrir imagem:', error);
    }
  }, []);

  // Registrar visualização do produto para recomendações
  useEffect(() => {
    let isMounted = true;
    if (!product || !product.id) return;

    const logProductView = async () => {
      try {
        const userId = user?.id || (user as any)?.uid;
        if (userId && isMounted) {
          await recommendationService.trackProductView(userId, product.id);
        } else if (isMounted) {
          await (recommendationService as any).trackAnonymousProductView(product.id);
        }
      } catch (error) {
        console.error('Erro ao registrar visualização:', error);
      }
    };

    logProductView();
    return () => { isMounted = false; };
  }, [product, user, recommendationService]);

  // Função para adicionar ao carrinho com animação
  const handleAddToCart = () => {
    try {
      if (!product) return;

      // Adicionar ao carrinho
      if (typeof addToCart === 'function') {
        addToCart(product);
      }

      // Feedback tátil
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Mostrar toast
      showToast('Produto adicionado ao carrinho', FeedbackType.SUCCESS);

      // Calcular posição para animação
      if (addToCartButtonRef.current) {
        (addToCartButtonRef.current as any)?.measure((_fx: any, _fy: any, width: any, _height: any, px: any, py: any) => {
          try {
            const startPosition = {
              x: px + (width || 0) / 2,
              y: py,
            };

            // Posição do carrinho no header (estimado)
            const endPosition = {
              x: (width || 0) - 30,
              y: 50,
            };

            // Iniciar animação
            setCartAnimation({
              visible: true,
              startPosition,
              endPosition,
            });
          } catch (error) {
            console.error('Erro ao calcular posição da animação:', error);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      showToast('Erro ao adicionar ao carrinho', FeedbackType.ERROR);
    }
  };

  // Função para exibir toast
  const showToast = (message: any, type = FeedbackType.SUCCESS) => {
    try {
      setToast({
        visible: true,
        message: message || '',
        type,
      });

      // Ocultar toast após um tempo
      setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000);
    } catch (error) {
      console.error('Erro ao mostrar toast:', error);
    }
  };

  // Finalizar animação do carrinho
  const handleCartAnimationComplete = () => {
    try {
      setCartAnimation(prev => ({ ...prev, visible: false }));
    } catch (error) {
      console.error('Erro ao finalizar animação do carrinho:', error);
    }
  };

  // Gerenciar notificação após compartilhamento
  const handleAfterShare = () => {
    try {
      showToast('Produto compartilhado!', FeedbackType.SUCCESS);
    } catch (error) {
      console.error('Erro ao processar compartilhamento:', error);
    }
  };

  // Atualizar título da tela com o nome do produto
  useEffect(() => {
    let isMounted = true;
    try {
      if (product && product.nome && isMounted && navigation?.setOptions) {
        navigation.setOptions({
          title: product.nome,
        });
      }
    } catch (error) {
      console.error('Erro ao definir título da tela:', error);
    }
    return () => { isMounted = false; };
  }, [navigation, product]);

  // Navegar para detalhes de outro produto
  const handleProductPress = (selectedProduct: any) => {
    try {
      if (navigation && (navigation as any).replace) {
        (navigation as any).replace('ProductDetails', { product: selectedProduct });
      }
    } catch (error) {
      console.error('Erro ao navegar para detalhes do produto:', error);
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
                {product.imagens.map((image: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.imageContainer}
                    onPress={() => handleImagePress(image)}
                    activeOpacity={0.9}
                  >
                    <EnhancedImage
                      source={{ uri: image }}
                      style={styles.productImage}
                      placeholderType={PlaceholderType.SKELETON}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Indicadores do carrossel */}
              {product.imagens.length > 1 && (
                <View style={styles.paginationContainer}>
                  {product.imagens.map((_: any, index: number) => {
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
          <Text style={styles.productName}>{product.nome || 'Produto sem nome'}</Text>
          <Text style={styles.productPrice}>R$ {(product.preco || 0).toFixed(2)}</Text>

          {/* Ações sociais (curtir, compartilhar) */}
          <ProductSocialActions product={product} onShare={handleAfterShare} />

          {/* Descrição do produto */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.descriptionText}>{product.descricao || 'Sem descrição disponível'}</Text>
          </View>

          {/* Informações adicionais */}
          {product.detalhes && (
            <View style={styles.detailsContainer}>
              <Text style={styles.sectionTitle}>Detalhes</Text>
              {Object.entries(product.detalhes).map(([key, value]) => (
                <View key={key} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{key}:</Text>
                  <Text style={styles.detailValue}>{String(value)}</Text>
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

      {/* Modal simples para visualização de imagem (sem zoom complexo) */}
      <Modal
        visible={modalImageVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalImageVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setModalImageVisible(false)}
          />
          <View style={styles.modalImageContainer}>
            {selectedImage && (
              <EnhancedImage
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
                placeholderType={PlaceholderType.ACTIVITY_INDICATOR}
              />
            )}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModalImageVisible(false)}
            >
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // ... existing styles ...
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  modalImageContainer: {
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: width,
  },
  closeModalButton: {
    position: 'absolute',
    top: -50,
    right: 20,
    padding: 10,
  },
  closeModalText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
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
    color: '#6C2BD9',
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
    backgroundColor: '#6C2BD9',
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
