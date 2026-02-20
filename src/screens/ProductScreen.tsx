import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme, Button, IconButton, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SkeletonList } from '@/components/base/SkeletonLoading';
import { ErrorMessage } from '@/components/ErrorMessage';
import { OptimizedList } from '@/components/OptimizedList';
import { OptimizedImage } from '@/components/OptimizedImage';
import cacheService from '@/services/cacheService';
import { Product } from '@/types/Product';
import { ProductService } from '@/services/ProductService';
import { StoreLocationButton } from '@/components/StoreLocationButton';
import { loggingService } from '@/services/LoggingService';
import { SafeAreaView } from 'react-native-safe-area-context';

// Configurações de dimensões para otimização
const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = width - 32; // 16px de padding em cada lado
const PRODUCT_IMAGE_HEIGHT = 180;

// Função otimizada para buscar produtos com cache
const fetchProducts = async (forceRefresh = false): Promise<Product[]> => {
  const cache = cacheService;

  // Tentar obter do cache
  const cached = await cache.getItem<Product[]>('products_all');
  if (cached && !forceRefresh) {
    return cached;
  }

  // Simulação da API - em produção seria uma chamada real à API
  const products: Product[] = [
    {
      id: '1',
      producerId: 'store_1',
      nome: 'Bolo de Chocolate',
      descricao: 'Delicioso bolo de chocolate com cobertura de brigadeiro.',
      preco: 45.0,
      categoria: 'Bolos',
      disponivel: true,
      imagens: ['https://via.placeholder.com/400x300'],
      dataCriacao: new Date(),
    },
    {
      id: '2',
      producerId: 'store_1',
      nome: 'Cupcake de Morango',
      descricao: 'Cupcake com cobertura de morango.',
      preco: 8.5,
      categoria: 'Cupcakes',
      disponivel: true,
      imagens: ['https://via.placeholder.com/400x300'],
      dataCriacao: new Date(),
    },
  ];

  await cache.setItem('products_all', products, { expiration: 24 * 60 * 60 * 1000 });
  return products;
};

// Item do produto memoizado para evitar re-renderizações desnecessárias
interface ProductItemProps {
  item: Product;
  onPress: () => void;
  onAddToCart: () => void;
  themeColors: any;
}

const ProductItem = memo(({
  item,
  onPress,
  onAddToCart,
  themeColors,
}: ProductItemProps) => (
  <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.7}>
    <OptimizedImage
      // Ajuste para compatibilidade com o tipo Product (usa imagens)
      source={{ uri: (item?.imagens && item.imagens[0]) || 'https://via.placeholder.com/400x300' }}
      style={styles.productImage}
      resizeMode="cover"
      placeholder={
        <View style={[styles.imagePlaceholder, { backgroundColor: themeColors.surfaceVariant }]} />
      }
    />
    <View style={styles.productDetails}>
      <Text style={styles.productName}>{item?.nome}</Text>
      <Text style={[styles.productPrice, { color: themeColors.primary }]}>
        R$ {(item?.preco ?? 0).toFixed(2)}
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: themeColors.primary }]}
        onPress={onAddToCart}
      >
        <Text style={styles.addButtonText}>Adicionar</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
));

interface RouteParams {
  productId: string;
}

export function ProductScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { productId } = route.params as RouteParams;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const productService = new ProductService();
        const productData = await productService.getProductById(productId);

        if (!productData) {
          setError('Produto não encontrado');
          return;
        }

        setProduct(productData);
      } catch (err) {
        setError('Erro ao carregar produto');
        loggingService.error('Erro ao carregar detalhes do produto', {
          productId,
          error: err,
        });
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  const handleAddToCart = () => {
    // Lógica para adicionar ao carrinho
    // loggingService.info('Produto adicionado ao carrinho', {
    //   productId,
    //   quantity,
    // });

    navigation.navigate('Cart' as never);
  };

  const handleQuantityChange = (value: number) => {
    // Não permitir quantidades menores que 1
    if (quantity + value < 1) return;
    setQuantity(quantity + value);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text style={styles.loadingText}>Carregando produto...</Text>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Produto não encontrado'}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Detalhes do Produto</Text>
        <IconButton icon="cart" size={24} onPress={() => navigation.navigate('Cart' as never)} />
      </View>

      <ScrollView style={styles.scrollView}>
        <Image
          // A API utiliza o campo "imagens" (array). Usamos a primeira imagem disponível.
          source={{ uri: (product.imagens && product.imagens[0]) || 'https://via.placeholder.com/400' }}
          style={styles.productImage}
          resizeMode="cover"
        />

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.nome}</Text>
          <Text style={styles.productPrice}>R$ {product.preco.toFixed(2).replace('.', ',')}</Text>

          <Divider style={styles.divider} />

          <Text style={styles.descriptionTitle}>Descrição</Text>
          <Text style={styles.description}>{product.descricao}</Text>

          {/* Botão para encontrar lojas próximas com este produto */}
          <View style={styles.locationSection}>
            <StoreLocationButton productId={productId} label="Encontrar lojas com este produto" />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantidade:</Text>
            <View style={styles.quantityControls}>
              <IconButton
                icon="minus"
                size={20}
                onPress={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              />
              <Text style={styles.quantityText}>{quantity}</Text>
              <IconButton icon="plus" size={20} onPress={() => handleQuantityChange(1)} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="contained" style={styles.addToCartButton} onPress={handleAddToCart}>
          Adicionar ao Carrinho
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Usado no ProductItem
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  imagePlaceholder: {
    width: '100%',
    height: PRODUCT_IMAGE_HEIGHT,
  },
  productDetails: {
    padding: 12,
  },
  addButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#777',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#e0e0e0',
    height: 1,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  locationSection: {
    marginTop: 16,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '500',
    marginHorizontal: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  addToCartButton: {
    backgroundColor: '#FF69B4',
  },
});

