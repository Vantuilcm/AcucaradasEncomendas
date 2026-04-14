import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image, RefreshControl } from 'react-native';
import { Text, Avatar, Title, Caption, Divider, Chip, List, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../components/ThemeProvider';
import { StoreService } from '../services/StoreService';
import { ProductService } from '../services/ProductService';
import { Store } from '../types/Store';
import { Product } from '../types/Product';
import { LoadingState } from '../components/base/LoadingState';
import { formatCurrency } from '../utils/formatters';

export function StorePreviewScreen() {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const storeService = new StoreService();
      const productService = ProductService.getInstance();
      
      const [storeData, productsData] = await Promise.all([
        storeService.getStoreByProducerId(user.id),
        productService.listarProdutos({ producerId: user.id } as any)
      ]);
      
      setStore(storeData);
      setProducts(productsData);
    } catch (error) {
      console.error('Erro ao carregar dados da vitrine:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading && !refreshing) {
    return <LoadingState message="Carregando sua vitrine..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Banner */}
        <View style={styles.bannerContainer}>
          {store?.banner ? (
            <Image source={{ uri: store.banner }} style={styles.banner} />
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Avatar.Icon size={64} icon="image" style={{ backgroundColor: 'transparent' }} />
            </View>
          )}
        </View>

        {/* Info da Loja */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {store?.logo ? (
              <Avatar.Image source={{ uri: store.logo }} size={80} style={styles.logo} />
            ) : (
              <Avatar.Icon size={80} icon="store" style={[styles.logo, { backgroundColor: theme.colors.primary }]} />
            )}
            <Chip 
              style={[styles.statusChip, { backgroundColor: store?.isOpen ? theme.colors.success : theme.colors.error }]}
              textStyle={{ color: '#fff', fontSize: 10 }}
            >
              {store?.isOpen ? 'ABERTA' : 'FECHADA'}
            </Chip>
          </View>

          <View style={styles.storeInfo}>
            <Title style={styles.storeName}>{store?.name || 'Sua Loja'}</Title>
            <Caption style={styles.storeDescription}>{store?.description || 'Nenhuma descrição cadastrada.'}</Caption>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Horários */}
        <List.Accordion
          title="Horário de Funcionamento"
          left={props => <List.Icon {...props} icon="clock-outline" />}
          style={styles.accordion}
        >
          {store?.businessHours ? Object.entries(store.businessHours).map(([day, hours]: [string, any]) => (
            <List.Item
              key={day}
              title={getDayName(parseInt(day))}
              right={() => <Text>{hours.isClosed ? 'Fechado' : `${hours.open} - ${hours.close}`}</Text>}
            />
          )) : <List.Item title="Não configurado" />}
        </List.Accordion>

        <Divider style={styles.divider} />

        {/* Produtos */}
        <View style={styles.productsSection}>
          <Title style={styles.sectionTitle}>Seus Produtos ({products.length})</Title>
          {products.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Avatar.Icon size={48} icon="package-variant" style={{ backgroundColor: theme.colors.surfaceVariant }} />
                <Text style={styles.emptyText}>Você ainda não tem produtos reais cadastrados.</Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.productsGrid}>
              {products.map(product => (
                <Card key={product.id} style={styles.productCard}>
                  {product.imagens?.[0] && <Card.Cover source={{ uri: product.imagens[0] }} style={styles.productImage} />}
                  <Card.Content style={styles.productInfoCard}>
                    <Text variant="titleSmall" numberOfLines={1}>{product.nome}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                      {formatCurrency(product.preco)}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getDayName = (day: number) => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[day] || '';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  bannerContainer: { height: 160, width: '100%' },
  banner: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, marginTop: -40, flexDirection: 'row', alignItems: 'flex-end' },
  logoContainer: { alignItems: 'center' },
  logo: { borderWidth: 3, borderColor: '#fff', elevation: 4 },
  statusChip: { marginTop: 8, height: 24 },
  storeInfo: { flex: 1, marginLeft: 16, marginBottom: 8 },
  storeName: { fontSize: 22, fontWeight: 'bold', lineHeight: 28 },
  storeDescription: { fontSize: 14, lineHeight: 18 },
  divider: { marginVertical: 8 },
  accordion: { backgroundColor: '#fff' },
  productsSection: { padding: 20 },
  sectionTitle: { marginBottom: 16 },
  emptyCard: { backgroundColor: '#f9f9f9', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ddd' },
  emptyContent: { alignItems: 'center', padding: 20 },
  emptyText: { marginTop: 12, textAlign: 'center', color: '#666' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: { width: '48%', marginBottom: 16, elevation: 2 },
  productImage: { height: 100 },
  productInfoCard: { padding: 8 },
});
