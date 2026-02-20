import React from 'react';
import { SafeAreaView, StyleSheet, View, Text } from 'react-native';
import { Appbar } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { AdvancedProductSearch } from '../components/AdvancedProductSearch';
import { useCart } from '../contexts/CartContext';
import type { RootStackParamList } from '../types/navigation';
import { Product } from '../types/Product';

// Use central Product type from src/types/Product to avoid mismatches

export default function ProductCatalogScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { itemCount } = useCart();

  // Navegar para a tela de detalhes do produto
  const handleProductPress = (product: Product) => {
    // Navigate using the typed route params (productId)
    (navigation as any).navigate('ProductDetails', { productId: product.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Catálogo de Produtos" />
        <Appbar.Action
          icon="cart"
          onPress={() => navigation.navigate('Cart')}
          style={styles.cartButton}
          size={24}
        />
        {itemCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
          </View>
        )}
      </Appbar.Header>

      <AdvancedProductSearch
        initialFilter={{}}
        showCategories={true}
        showSuggestions={true}
        numColumns={2}
        onProductPress={handleProductPress}
        emptyMessage="Nenhum produto disponível no momento"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  cartButton: {
    marginRight: 8,
  },
  cartBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#FF69B4',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
