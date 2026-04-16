import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, ActivityIndicator, Image, TouchableOpacity, FlatList } from 'react-native';
import { Text, Button, IconButton, Searchbar, Card, Chip, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { MainTabNavigationProp } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ProductService } from '../services/ProductService';
import { useLocation } from '../contexts/LocationContext';
import { StoreLocationButton } from '../components/StoreLocationButton';
import { loggingService } from '../services/LoggingService';
import type { Product } from '../types/Product';
import { useAppTheme, type ThemeType } from '../components/ThemeProvider';
import { usePermissions } from '../hooks/usePermissions';
import { AdminDashboardScreen } from './AdminDashboardScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoleRedirect } from '../hooks/useRoleRedirect';

const CATEGORIES = [
  { id: '1', name: 'Bolos', icon: 'cake-variant' },
  { id: '2', name: 'Doces', icon: 'candy' },
  { id: '3', name: 'Tortas', icon: 'pie' },
  { id: '4', name: 'Salgados', icon: 'food-croissant' },
  { id: '5', name: 'Bebidas', icon: 'cup-water' },
];

export function HomeScreen() {
  const navigation = useNavigation<MainTabNavigationProp<'Home'>>();
  const { user } = useAuth();
  const { isProdutor, isEntregador, isAdmin } = usePermissions();
  const { redirectToDashboard } = useRoleRedirect();
  const { updateLocation, nearbyStores, isLoadingStores } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Redirecionamento automático por Role (Build 1117)
  useEffect(() => {
    if (user && (isProdutor || isEntregador || isAdmin)) {
      redirectToDashboard();
    }
  }, [user, isProdutor, isEntregador, isAdmin, redirectToDashboard]);

  // Fallback visual para Produtor/Admin enquanto o redirect não ocorre
  if (isProdutor || isAdmin) {
    return <AdminDashboardScreen />;
  }

  const loadProducts = async () => {
    try {
      setProductLoading(true);
      const productService = ProductService.getInstance();
      const products = await productService.consultarDestaques();
      setFeaturedProducts(products);
    } catch (error) {
      loggingService.error('Erro ao carregar produtos destacados', { error });
    } finally {
      setProductLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      // Blindagem: Executar carregamentos de forma isolada
      await loadProducts().catch(e => console.error('Erro loadProducts', e));
      await updateLocation().catch(e => console.error('Erro updateLocation', e));
    } catch (error) {
      loggingService.error('Erro ao atualizar a tela inicial', { error });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // [BUILD 1126] Carregamento sequencial e seguro
    const initHome = async () => {
      try {
        await loadProducts();
        // Geodecodificação automática suspensa no boot para evitar travamento
        // updateLocation(); 
      } catch (e) {
        console.error('Falha no boot da Home', e);
      }
    };
    initHome();
  }, []);

  const renderCategory = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity 
      style={styles.categoryItem}
      onPress={() => (navigation as any).navigate('Catalog', { category: item.name.toLowerCase() })}
    >
      <Surface style={styles.categoryIcon} elevation={1}>
        <MaterialCommunityIcons name={item.icon as any} size={30} color={theme.colors.primary} />
      </Surface>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderStore = ({ item }: { item: any }) => (
    <Card 
      style={styles.storeCard} 
      onPress={() => {
        try {
          if (item?.id) {
            (navigation as any).navigate('StoreDetails', { storeId: item.id, storeName: item.name });
          }
        } catch (error) {
          console.error('Erro ao navegar para loja:', error);
        }
      }}
    >
      <Card.Cover source={{ uri: item.banner || 'https://via.placeholder.com/150' }} style={styles.storeBanner} />
      <Card.Content style={styles.storeContent}>
        <View style={styles.storeHeader}>
          <Text variant="titleMedium" style={styles.storeNameText} numberOfLines={1}>{item.name}</Text>
          <View style={styles.ratingBadge}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
            <Text style={styles.ratingText}>{item.rating || '5.0'}</Text>
          </View>
        </View>
        <Text variant="bodySmall" style={styles.storeDetailsText}>
          {item.isOpen ? '🟢 Aberto' : '🔴 Fechado'} • {item.distance ? `${item.distance.toFixed(1)}km` : 'Perto de você'}
        </Text>
      </Card.Content>
    </Card>
  );

  if (productLoading && featuredProducts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 15, color: theme.colors.text.secondary }}>Açucaradas Encomendas</Text>
        <Text style={{ marginTop: 5, fontSize: 12, color: '#999' }}>Sincronizando produtos...</Text>
        
        {/* Botão de segurança se o carregamento demorar mais de 10s */}
        <Button 
          mode="text" 
          onPress={() => setProductLoading(false)} 
          style={{ marginTop: 30 }}
        >
          Pular carregamento
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="home-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="O que você quer comer hoje?"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          onIconPress={() => (navigation as any).navigate('Catalog', { search: searchQuery })}
          onSubmitEditing={() => (navigation as any).navigate('Catalog', { search: searchQuery })}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.locationSection}>
          <StoreLocationButton />
        </View>

        {/* Categorias */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Categorias</Text>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategory}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Lojas Próximas */}
        {nearbyStores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Lojas Próximas</Text>
              <Button mode="text" compact onPress={() => (navigation as any).navigate('StoreList')}>Ver todas</Button>
            </View>
            <FlatList
              data={nearbyStores}
              renderItem={renderStore}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storesList}
            />
          </View>
        )}

        <View style={styles.featuredSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Destaques da Semana
          </Text>

          <View style={styles.productsGrid}>
            {productLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product: Product) => (
                <Card 
                  key={product.id} 
                  style={styles.productCard} 
                  onPress={() => {
                    try {
                      if (product?.id) {
                        navigation.navigate('ProductDetail', { productId: product.id, product });
                      }
                    } catch (error) {
                      console.error('Erro ao navegar para produto:', error);
                    }
                  }}
                >
                  <Card.Cover 
                    source={{ uri: product.imagens?.[0] || 'https://via.placeholder.com/150' }} 
                    style={styles.productImage} 
                  />
                  <Card.Content style={styles.productContent}>
                    <Text variant="titleSmall" style={styles.productName} numberOfLines={1}>
                      {product.nome}
                    </Text>
                    <Text variant="bodyMedium" style={styles.productPrice}>
                      R$ {product.preco.toFixed(2)}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            ) : (
              <Text style={styles.bodyText}>Nenhum produto destacado no momento.</Text>
            )}
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Text style={{ textAlign: 'center', color: '#999', fontSize: 10, marginBottom: 10 }}>Versão 1.1.8 (Build 1134)</Text>
          <Button
            mode="contained"
            onPress={() => {
              if (user) {
                navigation.navigate('Orders');
              } else {
                navigation.navigate('Login');
              }
            }}
            style={styles.button}
          >
            {user ? 'Meus Pedidos' : 'Entrar'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  searchBar: {
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#f1f3f5',
  },
  locationSection: {
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  section: {
    marginVertical: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
  },
  storesList: {
    paddingHorizontal: 15,
  },
  storeCard: {
    width: 240,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
  },
  storeBanner: {
    height: 100,
  },
  storeContent: {
    padding: 12,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeNameText: {
    fontWeight: 'bold',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFB800',
    marginLeft: 2,
  },
  storeDetailsText: {
    color: '#666',
    marginTop: 4,
  },
  featuredSection: {
    paddingVertical: 15,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    overflow: 'hidden',
  },
  productImage: {
    height: 120,
  },
  productContent: {
    padding: 10,
  },
  productName: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  productPrice: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  actionButtons: {
    padding: 20,
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
  },
  bodyText: {
    color: theme.colors.text.secondary,
    paddingHorizontal: 20,
  },
});
