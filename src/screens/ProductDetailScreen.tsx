import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { Text, Button, Card, Chip, IconButton, useTheme, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Tipo para os produtos
interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  available: boolean;
  ingredients?: string[];
  nutritionalInfo?: {
    calories: number;
    sugar: number;
    fat: number;
  };
  allergens?: string[];
}

// Dados de exemplo para produtos
const sampleProducts: Record<string, Product> = {
  '1': {
    id: '1',
    name: 'Bolo de Chocolate',
    price: 45.99,
    image: 'https://via.placeholder.com/400',
    category: 'Bolos',
    description: 'Delicioso bolo de chocolate com cobertura de brigadeiro. Feito com ingredientes selecionados e chocolate belga de alta qualidade. Perfeito para qualquer ocasião especial.',
    available: true,
    ingredients: ['Farinha de trigo', 'Açúcar', 'Chocolate em pó', 'Ovos', 'Leite', 'Manteiga'],
    nutritionalInfo: {
      calories: 320,
      sugar: 25,
      fat: 15,
    },
    allergens: ['Glúten', 'Leite', 'Ovos'],
  },
  '2': {
    id: '2',
    name: 'Cupcake de Baunilha',
    price: 8.99,
    image: 'https://via.placeholder.com/400',
    category: 'Cupcakes',
    description: 'Cupcake de baunilha com cobertura de buttercream. Leve e saboroso, perfeito para festas e eventos.',
    available: true,
    ingredients: ['Farinha de trigo', 'Açúcar', 'Essência de baunilha', 'Ovos', 'Leite', 'Manteiga'],
    nutritionalInfo: {
      calories: 180,
      sugar: 18,
      fat: 9,
    },
    allergens: ['Glúten', 'Leite', 'Ovos'],
  },
  '3': {
    id: '3',
    name: 'Torta de Limão',
    price: 39.99,
    image: 'https://via.placeholder.com/400',
    category: 'Tortas',
    description: 'Torta de limão com merengue. Uma combinação perfeita de doce e azedo que vai refrescar seu paladar.',
    available: true,
    ingredients: ['Farinha de trigo', 'Açúcar', 'Limão', 'Ovos', 'Leite condensado', 'Manteiga'],
    nutritionalInfo: {
      calories: 280,
      sugar: 22,
      fat: 12,
    },
    allergens: ['Glúten', 'Leite', 'Ovos'],
  },
};

export default function ProductDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = route.params as { productId: string };
  
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Simular carregamento do produto
  useEffect(() => {
    const loadProduct = async () => {
      // Aqui você faria uma chamada API real
      setTimeout(() => {
        setProduct(sampleProducts[productId] || null);
        setLoading(false);
      }, 500);
    };

    loadProduct();
  }, [productId]);

  const handleAddToCart = () => {
    // Aqui você adicionaria o produto ao carrinho
    // Por exemplo, chamando uma função do contexto de carrinho
    console.log(`Adicionando ${quantity} unidades do produto ${productId} ao carrinho`);
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
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Image source={{ uri: product.image }} style={styles.productImage} />
        
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="headlineSmall" style={styles.productName}>
              {product.name}
            </Text>
            <IconButton
              icon={isFavorite ? 'heart' : 'heart-outline'}
              iconColor={isFavorite ? theme.colors.error : undefined}
              size={24}
              onPress={toggleFavorite}
            />
          </View>
          
          <Chip style={styles.categoryChip}>{product.category}</Chip>
          
          <Text variant="headlineSmall" style={styles.productPrice}>
            R$ {product.price.toFixed(2)}
          </Text>
        </View>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Descrição</Text>
            <Text variant="bodyMedium">{product.description}</Text>
          </Card.Content>
        </Card>

        {product.ingredients && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Ingredientes</Text>
              <View style={styles.ingredientsList}>
                {product.ingredients.map((ingredient, index) => (
                  <Chip key={index} style={styles.ingredientChip}>{ingredient}</Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {product.nutritionalInfo && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Informação Nutricional</Text>
              <View style={styles.nutritionalInfo}>
                <View style={styles.nutritionalItem}>
                  <Text variant="bodyLarge">{product.nutritionalInfo.calories}</Text>
                  <Text variant="bodySmall">Calorias</Text>
                </View>
                <View style={styles.nutritionalItem}>
                  <Text variant="bodyLarge">{product.nutritionalInfo.sugar}g</Text>
                  <Text variant="bodySmall">Açúcar</Text>
                </View>
                <View style={styles.nutritionalItem}>
                  <Text variant="bodyLarge">{product.nutritionalInfo.fat}g</Text>
                  <Text variant="bodySmall">Gordura</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {product.allergens && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Alérgenos</Text>
              <View style={styles.ingredientsList}>
                {product.allergens.map((allergen, index) => (
                  <Chip key={index} style={styles.allergenChip}>{allergen}</Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {product.available ? (
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
          onPress: () => navigation.navigate('Cart'),
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