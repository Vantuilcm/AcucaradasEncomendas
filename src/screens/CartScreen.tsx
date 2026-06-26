import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useCart } from '../contexts/CartContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Divider, Surface } from 'react-native-paper';
import { useAppTheme } from '../components/ThemeProvider';
import { EnhancedImage, PlaceholderType } from '../components/EnhancedImage';
import { RecommendationService, ProductRecommendation } from '../services/RecommendationService';

type CartScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<CartScreenNavigationProp>();
  const { cart, removeItem, updateQuantity, cartTotal } = useCart() as any;
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (cart.items.length > 0) {
        try {
          const recService = RecommendationService.getInstance();
          const recs = await recService.generateMarketBasketAnalysis();
          // Pega apenas as primeiras 2 para não poluir
          if (recs && recs.length > 0) {
            setRecommendations(recs.slice(0, 2));
          }
        } catch (error) {
          console.log('Erro ao carregar recomendações', error);
        }
      }
    };
    fetchRecommendations();
  }, [cart.items.length]);

  const renderItem = ({ item }: any) => (
    <Card style={styles.cartItem} key={item.id}>
      <Card.Content style={styles.cartItemContent}>
        {item.image ? (
          <EnhancedImage
            source={{ uri: item.image }}
            style={styles.itemImage}
            placeholderType={PlaceholderType.ACTIVITY_INDICATOR}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>{item.name.charAt(0)}</Text>
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>R$ {item.price.toFixed(2)}</Text>

          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
              style={styles.quantityButton}
              disabled={item.quantity <= 1}
            >
              <Ionicons
                name="remove-circle"
                size={24}
                color={item.quantity <= 1 ? theme.colors.disabled : theme.colors.primary}
              />
            </TouchableOpacity>

            <Text style={styles.quantity}>{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
              style={styles.quantityButton}
            >
              <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => removeItem(item.id)}
          style={styles.removeButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meu Carrinho</Text>

      {cart.items.length > 0 ? (
        <>
          <FlatList
            data={cart.items}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />

          <Card style={styles.summaryCard}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>R$ {cartTotal.toFixed(2)}</Text>
              </View>

              <Text style={styles.scheduleInfo}>
                Frete calculado na próxima etapa conforme o endereço de entrega.
              </Text>

              <Divider style={styles.divider} />

              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>R$ {cartTotal.toFixed(2)}</Text>
              </View>

              <Button
                mode="contained"
                testID="finalizar-compra-button"
                style={styles.checkoutButton}
                labelStyle={styles.checkoutButtonText}
                icon="calendar-check"
                onPress={() => navigation.navigate('ScheduleDelivery')}
              >
                Agendar Entrega
              </Button>

              <Text style={styles.scheduleInfo}>
                Na próxima etapa você poderá escolher a data e horário para receber sua encomenda
              </Text>
            </Card.Content>
          </Card>

          {recommendations.length > 0 && (
            <Surface style={styles.recommendationSurface} elevation={1}>
              <View style={styles.recommendationHeader}>
                <MaterialCommunityIcons name="star-shooting" size={20} color="#E91E63" />
                <Text style={styles.recommendationTitle}>Clientes também compraram</Text>
              </View>
              {recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recommendationItem}>
                  <Text style={styles.recommendationText}>
                    Quem comprou <Text style={{fontWeight: 'bold'}}>{rec.productName}</Text> também levou <Text style={{fontWeight: 'bold'}}>{rec.recommendedProductName}</Text>
                  </Text>
                  <Button 
                    mode="text" 
                    textColor="#E91E63"
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
                  >
                    Ver
                  </Button>
                </View>
              ))}
            </Surface>
          )}
        </>
      ) : (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>Seu carrinho está vazio</Text>
          <Button
            mode="contained"
            style={styles.button}
            icon="shopping"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            Continuar Comprando
          </Button>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: { colors: any }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text.primary,
  },
  cartList: {
    paddingBottom: 16,
  },
  cartItem: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    elevation: 2,
  },
  cartItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: theme.colors.text.secondary,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  itemPrice: {
    fontSize: 15,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    padding: 4,
  },
  quantity: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 25,
    textAlign: 'center',
    color: theme.colors.text.primary,
  },
  removeButton: {
    padding: 8,
  },
  summaryCard: {
    marginTop: 10,
    borderRadius: 12,
    elevation: 3,
    backgroundColor: theme.colors.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  summaryValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  divider: {
    marginVertical: 10,
    backgroundColor: theme.colors.border,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  checkoutButton: {
    backgroundColor: theme.colors.primary,
    marginVertical: 16,
    borderRadius: 30,
    paddingVertical: 8,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    marginVertical: 20,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  scheduleInfo: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  recommendationSurface: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FCE4EC',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#C2185B',
    marginLeft: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: '#880E4F',
  },
});
