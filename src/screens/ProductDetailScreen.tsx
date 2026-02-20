import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { Text, Button, Card, Chip, IconButton, useTheme, Snackbar } from 'react-native-paper';
import { formatCurrency } from '../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types/Product';
import { ProductService } from '../services/ProductService';
import { useCart } from '../contexts/CartContext';
import { secureLoggingService } from '../services/SecureLoggingService';

export default function ProductDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { productId } = route.params as { productId: string };
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        let fetched: Product | null = null;
        const service = ProductService.getInstance();
        if (typeof (service as any).getProductById === 'function') {
          fetched = await (service as any).getProductById(productId);
        } else if (typeof (service as any).consultarProduto === 'function') {
          fetched = await (service as any).consultarProduto(productId);
        } else if (typeof (service as any).listarProdutos === 'function') {
          const list = await (service as any).listarProdutos({});
          fetched = (list as Product[]).find(p => p.id === productId) ?? null;
        }
        setProduct(fetched);
        setLoading(false);
        try { secureLoggingService.info('Produto carregado', { productId }); } catch {}
      } catch (e) {
        setLoading(false);
        setProduct(null);
        try { secureLoggingService.error('Erro ao carregar produto', { productId, error: e instanceof Error ? e.message : String(e) }); } catch {}
      }
    };
    loadProduct();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      producerId: product.producerId || 'producer_test_123', // Usar fallback temporário se não houver
      name: product.nome,
      price: product.preco,
      quantity: quantity,
      image: Array.isArray(product.imagens) && product.imagens.length > 0 ? product.imagens[0] : '',
    });
    setSnackbarVisible(true);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Carregando produto...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text>Produto não encontrado</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
          Voltar
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="produto-detalhe-screen">
      <ScrollView>
        <Image source={{ uri: Array.isArray(product.imagens) && product.imagens.length > 0 ? product.imagens[0] : 'https://via.placeholder.com/400' }} style={styles.productImage} />
        
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="headlineSmall" style={styles.productName}
            >
              {product.nome}
            </Text>
            <IconButton
              icon={isFavorite ? 'heart' : 'heart-outline'}
              iconColor={isFavorite ? theme.colors.error : undefined}
              size={24}
              onPress={toggleFavorite}
            />
            <IconButton
              icon="cart"
              size={24}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
              testID="carrinho-button"
            />
          </View>
          
          <Chip style={styles.categoryChip}>{product.categoria}</Chip>
          
          <Text variant="headlineSmall" style={styles.productPrice}>
            {formatCurrency(product.preco)}
          </Text>
        </View>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Descrição</Text>
            <Text variant="bodyMedium">{product.descricao}</Text>
          </Card.Content>
        </Card>

        {product.ingredientes && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Ingredientes</Text>
              <View style={styles.ingredientsList}>
                {product.ingredientes.map((ingredient, index) => (
                  <Chip key={index} style={styles.ingredientChip}>{ingredient}</Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {(product.informacoesNutricionais || product.nutricional) && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Informação Nutricional</Text>
              <View style={styles.nutritionalInfo}>
                <View style={styles.nutritionalItem}>
                  <Text variant="bodyLarge">{(product.informacoesNutricionais?.calorias ?? product.nutricional?.calorias) || 0}</Text>
                  <Text variant="bodySmall">Calorias</Text>
                </View>
                <View style={styles.nutritionalItem}>
                  <Text variant="bodyLarge">{(product.informacoesNutricionais?.acucares ?? product.nutricional?.acucares) || 0}g</Text>
                  <Text variant="bodySmall">Açúcar</Text>
                </View>
                <View style={styles.nutritionalItem}>
                  <Text variant="bodyLarge">{(product.informacoesNutricionais?.gorduras ?? product.nutricional?.gorduras) || 0}g</Text>
                  <Text variant="bodySmall">Gordura</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {product.alergenos && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Alérgenos</Text>
              <View style={styles.ingredientsList}>
                {product.alergenos.map((allergen, index) => (
                  <Chip key={index} style={styles.allergenChip}>{allergen}</Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {product.disponivel ? (
        <View style={styles.footer}>
          <View style={styles.quantitySelector}>
            <IconButton
              icon="minus"
              size={20}
              onPress={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            />
            <Text variant="titleMedium">{quantity}</Text>
            <IconButton
              icon="plus"
              size={20}
              onPress={() => handleQuantityChange(1)}
              disabled={quantity >= 10}
            />
          </View>
          <Button
            mode="contained"
            onPress={handleAddToCart}
            style={styles.addToCartButton}
            icon="cart"
            testID="adicionar-carrinho-button"
          >
            Adicionar ao Carrinho
          </Button>
        </View>
      ) : (
        <View style={styles.footer}>
          <Button
            mode="contained"
            disabled
            style={styles.unavailableButton}
          >
            Produto Indisponível
          </Button>
        </View>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Ver Carrinho',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Cart' }),
        }}
      >
        Produto adicionado ao carrinho!
      </Snackbar>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginTop: 20,
  },
  productImage: {
    width: width,
    height: width * 0.8,
    resizeMode: 'cover',
  },
  header: {
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    flex: 1,
    fontWeight: 'bold',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  productPrice: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ingredientChip: {
    margin: 4,
  },
  allergenChip: {
    margin: 4,
    backgroundColor: '#ffebee',
  },
  nutritionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  nutritionalItem: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  addToCartButton: {
    flex: 1,
  },
  unavailableButton: {
    flex: 1,
    backgroundColor: '#9e9e9e',
  },
});
