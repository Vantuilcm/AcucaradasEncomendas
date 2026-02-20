import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Appbar, Button, Divider, FAB, Menu, Switch, IconButton, Text } from 'react-native-paper';import { useAuth } from '../contexts/AuthContext';
import { SocialSharingService, WishlistItem } from '../services/SocialSharingService';
import { WishlistService } from '../services/WishlistService';
import { ProductService } from '../services/ProductService';
import { Product } from '../types/Product';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedImage, PlaceholderType } from '../components/EnhancedImage';
import { loggingService } from '../services/LoggingService';
import { ProductGridSkeleton } from '../components/SkeletonLoader';
import { FeedbackType, Toast } from '../components/FeedbackEffects';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface WishlistProduct extends Product {
  wishlistData: WishlistItem;
}

export default function WishlistScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<WishlistProduct | null>(null);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: FeedbackType.INFO,
  });
  const [isPublic, setIsPublic] = useState(false);

  const socialService = SocialSharingService.getInstance();
  const wishlistService = WishlistService.getInstance();
  const productService = new ProductService();

  // Carregar produtos da lista de desejos
  const loadWishlist = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Obter itens da lista de desejos
      const wishlistItems = await socialService.getWishlist(user.id);

      if (wishlistItems.length === 0) {
        setProducts([]);
        return;
      }

      // Obter detalhes dos produtos
      const productsDetails: WishlistProduct[] = [];

      for (const item of wishlistItems) {
        try {
          const product = await productService.getProductById(item.productId);

          if (product) {
            productsDetails.push({
              ...product,
              wishlistData: item,
            });
          }
        } catch (error) {
          loggingService.error('Erro ao obter detalhes do produto', {
            error,
            productId: item.productId,
          });
        }
      }

      // Ordenar por data de adição (mais recente primeiro)
      const sortedProducts = productsDetails.sort(
        (a, b) => b.wishlistData.dateAdded - a.wishlistData.dateAdded
      );

      setProducts(sortedProducts);

      // Buscar configurações de privacidade da lista
      const wishlistData = await wishlistService.getWishlistByUserId(user.id);
      if (wishlistData) {
        setIsPublic(wishlistData.isPublic);
      }
    } catch (error) {
      loggingService.error('Erro ao carregar lista de desejos', { error });
      showToast('Não foi possível carregar sua lista de desejos', FeedbackType.ERROR);
    } finally {
      setLoading(false);
    }
  }, [user, socialService, productService]);

  // Atualizar a lista de desejos quando a tela receber foco
  useFocusEffect(
    useCallback(() => {
      loadWishlist();
    }, [loadWishlist])
  );

  // Função para atualizar a lista
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWishlist();
    setRefreshing(false);
  };

  // Função para remover produto da lista
  const removeFromWishlist = async (product: WishlistProduct) => {
    if (!user) return;

    try {
      await socialService.removeFromWishlist(user.id, product.id);

      // Atualizar estado local
      setProducts(prev => prev.filter(p => p.id !== product.id));

      // Feedback tátil e visual
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Produto removido da lista de desejos', FeedbackType.SUCCESS);
    } catch (error) {
      loggingService.error('Erro ao remover produto da lista de desejos', {
        error,
        productId: product.id,
      });
      showToast('Não foi possível remover o produto', FeedbackType.ERROR);
    }
  };

  // Função para compartilhar a lista de desejos
  const shareWishlist = async () => {
    if (!user) return;

    try {
      setShareLoading(true);

      // Verificar se há itens públicos na lista
      const wishlistItems = await socialService.getWishlist(user.id);
      const publicItems = wishlistItems.filter(item => item.isPublic);

      if (publicItems.length === 0) {
        Alert.alert(
          'Nenhum item público',
          'Para compartilhar sua lista, torne pelo menos um produto público.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Tornar todos públicos', onPress: makeAllPublic },
          ]
        );
        return;
      }

      // Compartilhar a lista
      const shared = await socialService.shareWishlist(user.id, user.nome);

      if (shared) {
        // Feedback tátil e visual
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Lista de desejos compartilhada!', FeedbackType.SUCCESS);
      }
    } catch (error) {
      loggingService.error('Erro ao compartilhar lista de desejos', { error });
      showToast('Não foi possível compartilhar sua lista', FeedbackType.ERROR);
    } finally {
      setShareLoading(false);
    }
  };

  // Função para tornar todos os itens públicos
  const makeAllPublic = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Obter itens da lista de desejos
      const wishlistItems = await socialService.getWishlist(user.id);

      // Atualizar cada item para público
      for (const item of wishlistItems) {
        await socialService.setWishlistItemVisibility(user.id, item.productId, true);
      }

      // Recarregar a lista
      await loadWishlist();

      showToast('Todos os itens agora são públicos', FeedbackType.SUCCESS);
    } catch (error) {
      loggingService.error('Erro ao atualizar visibilidade dos itens', { error });
      showToast('Não foi possível atualizar os itens', FeedbackType.ERROR);
    } finally {
      setLoading(false);
    }
  };

  // Função para alternar a visibilidade de um item
  const toggleItemVisibility = async (product: WishlistProduct) => {
    if (!user) return;

    try {
      const newVisibility = !product.wishlistData.isPublic;

      await socialService.setWishlistItemVisibility(user.id, product.id, newVisibility);

      // Atualizar estado local
      setProducts(prev =>
        prev.map(p => {
          if (p.id === product.id) {
            return {
              ...p,
              wishlistData: {
                ...p.wishlistData,
                isPublic: newVisibility,
              },
            };
          }
          return p;
        })
      );

      showToast(
        newVisibility ? 'Item agora é público' : 'Item agora é privado',
        FeedbackType.SUCCESS
      );
    } catch (error) {
      loggingService.error('Erro ao atualizar visibilidade do item', {
        error,
        productId: product.id,
      });
      showToast('Não foi possível atualizar o item', FeedbackType.ERROR);
    }
  };

  // Função para exibir toast
  const showToast = (message: string, type: FeedbackType = FeedbackType.INFO) => {
    setToast({
      visible: true,
      message,
      type,
    });

    // Esconder o toast após um tempo
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Navegar para a tela de detalhes do produto
  const handleProductPress = (product: WishlistProduct) => {
    navigation.navigate('ProductDetails', { product });
  };

  // Função para alternar entre lista pública e privada
  const toggleWishlistPrivacy = async () => {
    if (!user) return;

    try {
      const newIsPublic = !isPublic;
      await wishlistService.updateWishlistPrivacy(user.id, newIsPublic);
      setIsPublic(newIsPublic);

      // Feedback tátil e visual
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(
        newIsPublic ? 'Lista pública ativada' : 'Lista privada ativada',
        FeedbackType.SUCCESS
      );
    } catch (error) {
      loggingService.error('Erro ao atualizar privacidade', { error });
      showToast('Erro ao alterar privacidade', FeedbackType.ERROR);
    }
  };

  // Renderizar item da lista
  const renderItem = ({ item }: { item: WishlistProduct }) => (
    <View style={styles.productItemContainer}>
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          <EnhancedImage
            source={{ uri: (Array.isArray(item.imagens) && item.imagens.length > 0) ? item.imagens[0] : 'https://via.placeholder.com/150' }}
            style={styles.productImage}
            placeholderType={PlaceholderType.SKELETON}
            lazy={true}
          />

          {/* Indicador de visibilidade */}
          <View style={styles.visibilityIndicator}>
            <Ionicons
              name={item.wishlistData.isPublic ? 'eye-outline' : 'eye-off-outline'}
              size={16}
              color="#FFF"
            />
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={styles.productPrice}>R$ {item.preco.toFixed(2)}</Text>

          <View style={styles.productActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedProduct(item);
                setMenuVisible(true);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#555" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => removeFromWishlist(item)}
            >
              <Ionicons name="trash-outline" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu de opções */}
        {menuVisible && selectedProduct?.id === item.id && (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={{ x: 0, y: 0 }}
          >
            <Menu.Item
              onPress={() => {
                toggleItemVisibility(item);
                setMenuVisible(false);
              }}
              title={item.wishlistData.isPublic ? 'Tornar privado' : 'Tornar público'}
            />
            <Menu.Item
              onPress={() => {
                socialService.shareProduct(item);
                setMenuVisible(false);
              }}
              title="Compartilhar"
            />
            <Divider />
            <Menu.Item
              onPress={() => {
                removeFromWishlist(item);
                setMenuVisible(false);
              }}
              title="Remover"
            />
          </Menu>
        )}
      </TouchableOpacity>

      <IconButton
        icon="close"
        size={24}
        style={styles.removeButton}
        iconColor={styles.removeButton.backgroundColor}
        onPress={() => removeFromWishlist(item)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Minha Lista de Desejos
        </Text>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={shareWishlist}
          disabled={products.length === 0}
        >
          <IconButton
            icon="share-variant"
            size={24}
            disabled={products.length === 0}
            iconColor={products.length > 0 ? '#FF69B4' : '#999'}
          />
          <Text style={styles.shareButtonText}>Compartilhar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.privacyContainer}>
        <Text>Lista pública</Text>
        <Switch value={isPublic} onValueChange={toggleWishlistPrivacy} color="#FF69B4" />
        <Text style={styles.privacyHint}>
          {isPublic
            ? 'Qualquer pessoa com o link pode ver sua lista'
            : 'Somente você pode ver sua lista'}
        </Text>
      </View>

      <Divider style={styles.divider} />

      {loading && !refreshing ? (
        <ProductGridSkeleton columns={2} rows={3} />
      ) : (
        <>
          {products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>Sua lista de desejos está vazia</Text>
              <Text style={styles.emptySubtext}>
                Adicione produtos à sua lista de desejos para vê-los aqui
              </Text>
              <Button
                mode="contained"
                style={styles.browseButton}
                onPress={() => navigation.navigate('ProductCatalog')}
              >
                Explorar produtos
              </Button>
            </View>
          ) : (
            <FlatList
              data={products}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              numColumns={2}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          )}
        </>
      )}

      {/* Toast para feedback */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
  },
  shareButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 12,
    marginTop: -8,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  privacyHint: {
    fontSize: 12,
    color: '#777',
    marginLeft: 8,
  },
  divider: {
    marginVertical: 8,
  },
  listContainer: {
    padding: 8,
    paddingBottom: 100, // Espaço para o FAB
  },
  productItemContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
    maxWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'relative',
  },
  productCard: {
    flex: 1,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 150,
  },
  visibilityIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 8,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
  },
  removeButton: {
    backgroundColor: '#FF69B4',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#FF69B4',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF69B4',
  },
});






