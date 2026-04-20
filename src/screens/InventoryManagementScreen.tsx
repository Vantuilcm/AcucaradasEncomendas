import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  FAB,
  Chip,
  IconButton,
  TextInput,
  Portal,
  Modal,
  Button,
  Switch,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductService } from '../services/ProductService';
import { Product } from '../types/Product';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAppTheme } from '../components/ThemeProvider';
import { usePermissions } from '../hooks/usePermissions';
import { useNavigation } from '@react-navigation/native';

export function InventoryManagementScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const productService = useMemo(() => ProductService.getInstance(), []);
  const { isAdmin, isProdutor } = usePermissions();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStock, setEditStock] = useState('');
  const [editHasStock, setEditHasStock] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.listarProdutos();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleEditStock = (product: Product) => {
    setSelectedProduct(product);
    setEditStock(product.estoque?.toString() || '0');
    setEditHasStock(product.temEstoque || false);
    setShowEditModal(true);
  };

  const handleSaveStock = async () => {
    if (!selectedProduct) return;

    try {
      const stockValue = parseInt(editStock, 10);
      if (isNaN(stockValue)) {
        Alert.alert('Erro', 'Por favor, insira um número válido para o estoque');
        return;
      }

      await productService.atualizarProduto(selectedProduct.id, {
        estoque: stockValue,
        temEstoque: editHasStock,
      });

      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, estoque: stockValue, temEstoque: editHasStock } 
          : p
      ));
      
      setShowEditModal(false);
      Alert.alert('Sucesso', 'Estoque atualizado com sucesso');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar o estoque');
    }
  };

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !refreshing) {
    return <LoadingState message="Carregando estoque..." />;
  }

  // Verificar se o usuário é administrador ou produtor
  if (!isAdmin && !isProdutor) {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Gerenciamento de Estoque
        </Text>
        <Searchbar
          placeholder="Buscar produto..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && <ErrorMessage message={error} onRetry={loadProducts} />}

        <View style={styles.listContainer}>
          {filteredProducts.map((product) => (
            <Card key={product.id} style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.productInfo}>
                  <Text variant="titleMedium">{product.nome}</Text>
                  <Text variant="bodySmall">{product.categoria}</Text>
                  
                  <View style={styles.stockStatus}>
                    <Chip 
                      mode="flat" 
                      style={[
                        styles.chip, 
                        { backgroundColor: product.temEstoque ? theme.colors.success + '20' : theme.colors.error + '20' }
                      ]}
                      textStyle={{ color: product.temEstoque ? theme.colors.success : theme.colors.error }}
                    >
                      {product.temEstoque ? 'Em Estoque' : 'Esgotado'}
                    </Chip>
                    <Text variant="titleSmall" style={styles.stockCount}>
                      Qtd: {product.estoque || 0}
                    </Text>
                  </View>
                </View>
                
                <IconButton
                  icon="pencil"
                  mode="contained"
                  onPress={() => handleEditStock(product)}
                />
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Ajustar Estoque
          </Text>
          <Text variant="bodyMedium" style={styles.productName}>
            {selectedProduct?.nome}
          </Text>

          <View style={styles.switchContainer}>
            <Text>Disponível em estoque?</Text>
            <Switch
              value={editHasStock}
              onValueChange={setEditHasStock}
              color={theme.colors.primary}
            />
          </View>

          <TextInput
            label="Quantidade em Estoque"
            value={editStock}
            onChangeText={setEditStock}
            keyboardType="numeric"
            style={styles.input}
          />

          <View style={styles.modalActions}>
            <Button onPress={() => setShowEditModal(false)}>Cancelar</Button>
            <Button mode="contained" onPress={handleSaveStock}>Salvar</Button>
          </View>
        </Modal>
      </Portal>

      <FAB
        icon="refresh"
        style={styles.fab}
        onPress={loadProducts}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  title: {
    marginBottom: 16,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: theme.colors.surfaceVariant,
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  chip: {
    height: 32,
  },
  stockCount: {
    marginLeft: 12,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 8,
  },
  productName: {
    marginBottom: 20,
    color: theme.colors.secondary,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});
