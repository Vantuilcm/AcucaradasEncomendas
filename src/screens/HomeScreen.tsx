import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { Text, Button, Searchbar, Card, Surface } from 'react-native-paper';
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
import { AppVersion } from '../utils/AppVersion';
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

const EMOTIONAL_BANNERS = [
  "Feito artesanalmente hoje ✨",
  "Os queridinhos da semana 🍓",
  "Doces para presentear quem você ama 💝",
  "O sabor da verdadeira confeitaria 🧁"
];

export function HomeScreen() {
  const navigation = useNavigation<MainTabNavigationProp<'Home'>>();
  const { user } = useAuth();
  const { isProdutor, isEntregador, isAdmin } = usePermissions();
  const { redirectToDashboard } = useRoleRedirect();
  const { updateLocation, nearbyStores, isLoadingStores: _isLoadingStores } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBanner, setCurrentBanner] = useState(EMOTIONAL_BANNERS[0]);
  const { theme, isDark, toggleTheme: _toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Rotacionar banner emocional
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner(prev => {
        const currentIndex = EMOTIONAL_BANNERS.indexOf(prev);
        const nextIndex = (currentIndex + 1) % EMOTIONAL_BANNERS.length;
        return EMOTIONAL_BANNERS[nextIndex];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
    // MISSÃO ZERO TELA BRANCA: Bypassing product queries
    setFeaturedProducts([]);
    setProductLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshing(false);
  };

  useEffect(() => {
    setProductLoading(false);
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
        <View style={styles.storeDetailsRow}>
          <View style={[styles.statusDot, { backgroundColor: item.isOpen ? '#4CAF50' : '#E53935' }]} />
          <Text variant="bodySmall" style={styles.storeDetailsText}>
            {item.isOpen ? 'Aberto agora' : 'Fechado no momento'} • {item.distance ? `${item.distance.toFixed(1)}km` : 'Perto de você'}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (productLoading && featuredProducts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 15, color: theme.colors.text.secondary, fontWeight: '500' }}>Preparando a vitrine...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="home-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Qual doce vai adoçar seu dia?"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          onIconPress={() => (navigation as any).navigate('Catalog', { search: searchQuery })}
          onSubmitEditing={() => (navigation as any).navigate('Catalog', { search: searchQuery })}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Banner Emocional */}
        <View style={[styles.emotionalBanner, { backgroundColor: theme.colors.surfaceVariant || '#FCE4EC' }]}>
          <Text style={[styles.emotionalBannerText, { color: theme.colors.primary }]}>{currentBanner}</Text>
        </View>

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
              <Text variant="titleMedium" style={styles.sectionTitle}>Confeitarias perto de você</Text>
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

        {/* Seção Emocional: Perfeito para Agora */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Perfeito para Agora 💝</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentsList}>
            {['Café da tarde', 'Festa infantil', 'Presente', 'Pós almoço'].map((moment, index) => (
              <TouchableOpacity key={index} style={[styles.momentChip, { backgroundColor: theme.colors.surfaceVariant || '#F5F5F5' }]}>
                <Text style={styles.momentText}>{moment}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.featuredSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Em Alta Hoje 🔥
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
          <Text style={{ textAlign: 'center', color: '#999', fontSize: 10, marginBottom: 10 }}>{AppVersion.getDisplayString()}</Text>
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
  emotionalBanner: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionalBannerText: {
    fontWeight: 'bold',
    fontSize: 14,
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
  storeDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  storeDetailsText: {
    color: '#666',
  },
  momentsList: {
    paddingHorizontal: 15,
  },
  momentChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  momentText: {
    fontWeight: '500',
    color: '#444',
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
