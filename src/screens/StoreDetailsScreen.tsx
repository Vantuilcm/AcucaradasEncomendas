import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList } from 'react-native';
import { Text, Button, Card, Title, Paragraph, IconButton, Avatar, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { StoreService } from '../services/StoreService';
import { ProductService } from '../services/ProductService';
import { Store } from '../types/Store';
import { Product } from '../types/Product';
import { LoadingState } from '../components/base/LoadingState';
import { formatCurrency } from '../utils/formatters';
import { useAppTheme } from '../components/ThemeProvider';
import { useCart } from '../contexts/CartContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type StoreDetailsRouteProp = RouteProp<RootStackParamList, 'StoreDetails'>;

export function StoreDetailsScreen() {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { addItem } = useCart() as any;
  const route = useRoute<StoreDetailsRouteProp>();
  const { storeId, storeName } = route.params || {};

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  useEffect(() => {
    const loadStoreData = async () => {
      if (!storeId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const storeService = new StoreService();
        const productService = ProductService.getInstance();

        const [storeData, productsData] = await Promise.all([
          storeService.getStoreByProducerId(storeId),
          productService.listarProdutos({ producerId: storeId } as any)
        ]);

        setStore(storeData);
        setProducts(productsData || []);
      } catch (error) {
        console.error('Erro ao carregar dados da loja:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStoreData();
  }, [storeId]);

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.categoria || 'Outros')))];
  
  const filteredProducts = activeCategory === 'Todos' 
    ? products 
    : products.filter(p => (p.categoria || 'Outros') === activeCategory);

  const handleQuickAdd = async (product: Product) => {
    try {
      await addItem({
        productId: product.id,
        productName: product.nome,
        price: product.preco,
        quantity: 1,
        storeId: product.producerId,
        storeName: store?.name || 'Loja',
        image: product.imagens?.[0]
      });
      // Um pequeno feedback visual poderia ir aqui (ex: Snackbar)
    } catch (error) {
      console.error('Erro ao adicionar rápido ao carrinho:', error);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Card style={styles.productCard} onPress={() => (navigation as any).navigate('ProductDetails', { product: item })}>
      <View style={styles.productCardInner}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.nome}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>{item.descricao || 'Feito artesanalmente'}</Text>
          <Text style={styles.productPrice}>{formatCurrency(item.preco)}</Text>
        </View>
        <View style={styles.productImageContainer}>
          {item.imagens && item.imagens.length > 0 ? (
            <Image source={{ uri: item.imagens[0] }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <MaterialCommunityIcons name="cake-variant" size={32} color="#ccc" />
            </View>
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => handleQuickAdd(item)}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (loading) return <LoadingState message="Preparando vitrine..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Premium */}
        <View style={styles.headerContainer}>
          <Image 
            source={{ uri: store?.banner || 'https://images.unsplash.com/photo-1557925923-33b251d32202?q=80&w=600&auto=format&fit=crop' }} 
            style={styles.banner}
          />
          <View style={styles.headerOverlay}>
            <IconButton 
              icon="arrow-left" 
              iconColor="#fff" 
              size={24} 
              style={styles.backBtn}
              onPress={() => navigation.goBack()} 
            />
          </View>
          
          <View style={styles.storeProfileCard}>
            <View style={styles.logoWrapper}>
              {store?.logo ? (
                <Image source={{ uri: store.logo }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{(storeName || 'L').charAt(0)}</Text>
                </View>
              )}
            </View>
            <View style={styles.storeProfileInfo}>
              <Text style={styles.storeNameText}>{store?.name || storeName || 'Confeitaria Artesanal'}</Text>
              <Text style={styles.storeBioText} numberOfLines={2}>
                {store?.description || 'Produzindo doces com carinho e ingredientes selecionados para momentos especiais.'}
              </Text>
              
              <View style={styles.badgesRow}>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
                  <Text style={styles.badgeText}> 4.9</Text>
                </View>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="clock-fast" size={14} color="#43A047" />
                  <Text style={styles.badgeText}> 40-50 min</Text>
                </View>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="shield-check" size={14} color="#1E88E5" />
                  <Text style={styles.badgeText}> Artesanal</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {products.length > 0 ? (
          <>
            {/* Categorias (Chips Elegantes) */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.categoryChip, 
                    activeCategory === cat && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    activeCategory === cat && { color: '#fff', fontWeight: 'bold' }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Divider style={styles.divider} />

            {/* Destaques (Se na aba 'Todos') */}
            {activeCategory === 'Todos' && products.length >= 2 && (
              <View style={styles.highlightsSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="fire" size={24} color="#E53935" />
                  <Text style={styles.sectionTitle}>Mais Vendidos</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightsScroll}>
                  {products.slice(0, 3).map(prod => (
                    <Card key={`high_${prod.id}`} style={styles.highlightCard} onPress={() => (navigation as any).navigate('ProductDetails', { product: prod })}>
                      <View style={styles.highlightImageContainer}>
                        {prod.imagens?.[0] ? (
                          <Image source={{ uri: prod.imagens[0] }} style={styles.highlightImage} />
                        ) : (
                          <View style={[styles.highlightImage, styles.placeholderImage]} />
                        )}
                        <View style={styles.highlightBadge}>
                          <Text style={styles.highlightBadgeText}>Top 1</Text>
                        </View>
                      </View>
                      <Card.Content style={styles.highlightContent}>
                        <Text style={styles.highlightName} numberOfLines={1}>{prod.nome}</Text>
                        <Text style={styles.highlightPrice}>{formatCurrency(prod.preco)}</Text>
                      </Card.Content>
                    </Card>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Lista de Produtos */}
            <View style={styles.productListContainer}>
              <Text style={styles.listTitle}>{activeCategory === 'Todos' ? 'Cardápio Completo' : activeCategory}</Text>
              {filteredProducts.map(prod => (
                <View key={prod.id}>{renderProduct({ item: prod })}</View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="storefront-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>O cardápio desta confeitaria está sendo atualizado.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingBottom: 40 },
  
  headerContainer: { backgroundColor: '#fff', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  banner: { width: '100%', height: 160, resizeMode: 'cover' },
  headerOverlay: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' },
  backBtn: { backgroundColor: 'rgba(0,0,0,0.4)' },
  
  storeProfileCard: { flexDirection: 'row', paddingHorizontal: 20, marginTop: -30 },
  logoWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', padding: 3, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  logo: { width: '100%', height: '100%', borderRadius: 37 },
  storeProfileInfo: { flex: 1, marginLeft: 16, marginTop: 36 },
  storeNameText: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  storeBioText: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },
  
  badgesRow: { flexDirection: 'row', marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginBottom: 4 },
  badgeText: { fontSize: 12, color: '#444', fontWeight: '500' },
  
  categoriesContainer: { paddingHorizontal: 16, paddingVertical: 16 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#fff', marginRight: 8, height: 36, justifyContent: 'center' },
  categoryChipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  divider: { height: 8, backgroundColor: '#F5F5F5' },
  
  highlightsSection: { paddingVertical: 20, backgroundColor: '#fff' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginLeft: 8 },
  highlightsScroll: { paddingHorizontal: 16 },
  highlightCard: { width: 140, marginRight: 12, borderRadius: 12, backgroundColor: '#fff', elevation: 2, overflow: 'hidden' },
  highlightImageContainer: { position: 'relative' },
  highlightImage: { width: '100%', height: 110, resizeMode: 'cover' },
  highlightBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#E53935', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  highlightBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  highlightContent: { padding: 10 },
  highlightName: { fontSize: 13, color: '#333', fontWeight: '500' },
  highlightPrice: { fontSize: 14, color: '#1A1A1A', fontWeight: 'bold', marginTop: 4 },
  
  productListContainer: { paddingHorizontal: 20, paddingTop: 20 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 },
  productCard: { marginBottom: 16, borderRadius: 16, backgroundColor: '#fff', elevation: 1, overflow: 'hidden' },
  productCardInner: { flexDirection: 'row', padding: 12 },
  productInfo: { flex: 1, paddingRight: 12, justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  productDescription: { fontSize: 13, color: '#777', lineHeight: 18, marginBottom: 8 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
  productImageContainer: { position: 'relative' },
  productImage: { width: 90, height: 90, borderRadius: 12 },
  placeholderImage: { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  addButton: { position: 'absolute', bottom: -5, right: -5, width: 32, height: 32, borderRadius: 16, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 16, fontSize: 16 },
});
