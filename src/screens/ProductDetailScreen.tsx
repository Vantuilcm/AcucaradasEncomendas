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
  Alert,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { EnhancedImage, PlaceholderType } from '../components/EnhancedImage';
import { ProductRecommendations } from '../components/ProductRecommendations';
import { ProductSocialActions } from '../components/ProductSocialActions';
import { RecommendationService } from '../services/RecommendationService';
import { FeedbackType, Toast, CartAddEffect, FeedbackButton } from '../components/FeedbackEffects';
import { ProductService } from '../services/ProductService';
import * as Haptics from 'expo-haptics';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { LoadingState } from '../components/base/LoadingState';

const { width } = Dimensions.get('window');

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { addToCart } = useCart() as any;
  const { user } = useAuth();
  
  // Suporte a passar o objeto inteiro ou apenas o ID
  const { productId, product: initialProduct } = route.params || {};

  const [product, setProduct] = useState<any>(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
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

  // Carregar dados se apenas o ID foi fornecido
  useEffect(() => {
    if (!product && productId) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          const productService = ProductService.getInstance();
          const data = await productService.consultarProduto(productId);
          if (data) {
            setProduct(data);
          }
        } catch (error) {
          console.error('Erro ao buscar produto:', error);
          Alert.alert('Erro', 'Não foi possível carregar os detalhes do produto.');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [productId, product]);

  const handleImagePress = useCallback((uri: string) => {
    try {
      if (uri) {
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
        const userId = user?.id;
        if (userId && isMounted) {
          // Temporariamente desativado até implementação no RecommendationService
          // await recommendationService.trackProductView(userId, product.id);
        }
      } catch (error) {
        console.error('Erro ao registrar visualização:', error);
      }
    };

    logProductView();
    return () => { isMounted = false; };
  }, [product, user, recommendationService]);

  const handleAddToCart = () => {
    try {
      if (!product) return;

      if (typeof addToCart === 'function') {
        addToCart(product);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      showToast('Produto adicionado ao carrinho', FeedbackType.SUCCESS);

      if (addToCartButtonRef.current) {
        (addToCartButtonRef.current as any)?.measure((_fx: any, _fy: any, mWidth: any, _height: any, px: any, py: any) => {
          try {
            setCartAnimation({
              visible: true,
              startPosition: { x: px + (mWidth || 0) / 2, y: py },
              endPosition: { x: (mWidth || 0) - 30, y: 50 },
            });
          } catch (error) {
            console.error('Erro ao calcular animação:', error);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      showToast('Erro ao adicionar ao carrinho', FeedbackType.ERROR);
    }
  };

  const showToast = (message: string, type = FeedbackType.SUCCESS) => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleProductPress = (selectedProduct: any) => {
    try {
      navigation.push('ProductDetail', { product: selectedProduct, productId: selectedProduct.id });
    } catch (error) {
      console.error('Erro ao navegar:', error);
    }
  };

  if (loading) return <LoadingState message="Carregando produto..." />;

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Produto não encontrado</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          Voltar
        </Button>
      </View>
    );
  }

  const images = product.imagens || (product.image ? [product.image] : (product.imagem ? [product.imagem] : []));

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Carrossel de imagens */}
        <View style={styles.imageCarouselContainer}>
          {images.length > 0 ? (
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
                {images.map((image: any, index: number) => (
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

              {images.length > 1 && (
                <View style={styles.paginationContainer}>
                  {images.map((_: any, index: number) => {
                    const dotWidth = scrollX.interpolate({
                      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                      outputRange: [8, 16, 8],
                      extrapolate: 'clamp',
                    });
                    const opacity = scrollX.interpolate({
                      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
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

        <View style={styles.productInfoContainer}>
          <Text style={styles.productName}>{product.nome || product.name || 'Produto'}</Text>
          <Text style={styles.productPrice}>R$ {(product.preco || product.price || 0).toFixed(2)}</Text>

          <ProductSocialActions product={product} />

          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.descriptionText}>{product.descricao || product.description || 'Sem descrição.'}</Text>
          </View>

          <View style={styles.addToCartContainer} ref={addToCartButtonRef} collapsable={false}>
            <FeedbackButton
              onPress={handleAddToCart}
              hapticFeedback={true}
              hapticType="medium"
              style={styles.addToCartButton}
            >
              <Text style={styles.addToCartButtonText}>Adicionar ao Carrinho</Text>
            </FeedbackButton>
          </View>

          <ProductRecommendations
            title="Você também pode gostar"
            onProductPress={handleProductPress}
            recommendationType="viewed"
            cardStyle="compact"
            containerStyle={styles.recommendationsContainer}
          />
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev: any) => ({ ...prev, visible: false }))}
      />

      {cartAnimation.visible && (
        <CartAddEffect
          startPosition={cartAnimation.startPosition}
          endPosition={cartAnimation.endPosition}
          onAnimationComplete={() => setCartAnimation(prev => ({ ...prev, visible: false }))}
        />
      )}

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
  container: { flex: 1, backgroundColor: '#fff' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#666' },
  imageCarouselContainer: { position: 'relative', height: 300, backgroundColor: '#f8f8f8' },
  imageContainer: { width: width, height: 300 },
  productImage: { width: '100%', height: '100%' },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 16, left: 0, right: 0 },
  paginationDot: { height: 8, borderRadius: 4, backgroundColor: '#fff', marginHorizontal: 4, elevation: 5 },
  productInfoContainer: { padding: 16 },
  productName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  productPrice: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 16 },
  descriptionContainer: { marginTop: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  descriptionText: { fontSize: 15, lineHeight: 22, color: '#555' },
  addToCartContainer: { marginTop: 10, marginBottom: 30 },
  addToCartButton: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  addToCartButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  recommendationsContainer: { marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalBackground: { ...StyleSheet.absoluteFillObject },
  modalImageContainer: { width: width, height: width, justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: width, height: width },
  closeModalButton: { position: 'absolute', top: -50, right: 20, padding: 10 },
  closeModalText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
});
