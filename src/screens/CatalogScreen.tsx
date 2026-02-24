import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Searchbar, Card, Text, Chip, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Tipo para os produtos
interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  available: boolean;
}

// Dados de exemplo para produtos
const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Bolo de Chocolate',
    price: 45.99,
    image: 'https://via.placeholder.com/150',
    category: 'Bolos',
    description: 'Delicioso bolo de chocolate com cobertura de brigadeiro',
    available: true,
  },
  {
    id: '2',
    name: 'Cupcake de Baunilha',
    price: 8.99,
    image: 'https://via.placeholder.com/150',
    category: 'Cupcakes',
    description: 'Cupcake de baunilha com cobertura de buttercream',
    available: true,
  },
  {
    id: '3',
    name: 'Torta de Limão',
    price: 39.99,
    image: 'https://via.placeholder.com/150',
    category: 'Tortas',
    description: 'Torta de limão com merengue',
    available: true,
  },
  {
    id: '4',
    name: 'Brigadeiro Gourmet',
    price: 3.99,
    image: 'https://via.placeholder.com/150',
    category: 'Doces',
    description: 'Brigadeiro gourmet com chocolate belga',
    available: true,
  },
  {
    id: '5',
    name: 'Bolo Red Velvet',
    price: 55.99,
    image: 'https://via.placeholder.com/150',
    category: 'Bolos',
    description: 'Bolo red velvet com cream cheese',
    available: false,
  },
];

// Categorias disponíveis
const categories = ['Todos', 'Bolos', 'Cupcakes', 'Tortas', 'Doces'];

export default function CatalogScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Simular carregamento de produtos
  useEffect(() => {
    const loadProducts = async () => {
      // Aqui você faria uma chamada API real
      setTimeout(() => {
        setProducts(sampleProducts);
        setLoading(false);
      }, 1000);
    };

    loadProducts();
  }, []);

  // Filtrar produtos por categoria e busca
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Renderizar item do produto
  const renderProductItem = ({ item }: { item: Product }) => (
    <Card
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Card.Cover source={{ uri: item.image }} style={styles.productImage} />
      <Card.Content style={styles.productContent}>
        <Text variant="titleMedium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="bodyMedium" style={styles.productPrice}>
          R$ {item.price.toFixed(2)}
        </Text>
        {!item.available && (
          <Chip
            style={styles.unavailableChip}
            textStyle={{ color: theme.colors.error }}
          >
            Indisponível
          </Chip>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Buscar produtos"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item}
              onPress={() => setSelectedCategory(item)}
              style={styles.categoryChip}
              selectedColor={theme.colors.primary}
            >
              {item}
            </Chip>
          )}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="titleMedium">Nenhum produto encontrado</Text>
              <Text variant="bodyMedium">
                Tente mudar os filtros ou a busca
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    margin: 10,
    elevation: 2,
  },
  categoriesContainer: {
    marginBottom: 10,
  },
  categoriesList: {
    paddingHorizontal: 10,
  },
  categoryChip: {
    marginHorizontal: 4,
  },
  productsList: {
    padding: 8,
  },
  productCard: {
    flex: 1,
    margin: 8,
    maxWidth: '46%',
  },
  productImage: {
    height: 120,
  },
  productContent: {
    padding: 8,
  },
  productPrice: {
    marginTop: 4,
    fontWeight: 'bold',
  },
  unavailableChip: {
    marginTop: 8,
    backgroundColor: '#ffebee',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});