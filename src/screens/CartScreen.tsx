import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Divider } from 'react-native-paper';

export default function CartScreen() {
  const navigation = useNavigation();
  const { items, removeFromCart, updateQuantity, total } = useCart();

  const renderItem = ({ item }) => (
    <Card style={styles.cartItem} key={item.product.id}>
      <Card.Content style={styles.cartItemContent}>
        {item.product.image ? (
          <Image source={{ uri: item.product.image }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>{item.product.name.charAt(0)}</Text>
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.product.name}</Text>
          <Text style={styles.itemPrice}>R$ {item.product.price.toFixed(2)}</Text>

          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
              style={styles.quantityButton}
              disabled={item.quantity <= 1}
            >
              <Ionicons
                name="remove-circle"
                size={24}
                color={item.quantity <= 1 ? '#ccc' : '#ff69b4'}
              />
            </TouchableOpacity>

            <Text style={styles.quantity}>{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
              style={styles.quantityButton}
            >
              <Ionicons name="add-circle" size={24} color="#ff69b4" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => removeFromCart(item.product.id)}
          style={styles.removeButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="trash-outline" size={22} color="#ff4444" />
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meu Carrinho</Text>

      {items.length > 0 ? (
        <>
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={item => item.product.id}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />

          <Card style={styles.summaryCard}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>R$ {total.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frete:</Text>
                <Text style={styles.summaryValue}>R$ 10,00</Text>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>R$ {(total + 10).toFixed(2)}</Text>
              </View>

              <Button
                mode="contained"
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
        </>
      ) : (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>Seu carrinho está vazio</Text>
          <Button
            mode="contained"
            style={styles.button}
            icon="shopping"
            onPress={() => navigation.navigate('Home')}
          >
            Continuar Comprando
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  cartList: {
    paddingBottom: 16,
  },
  cartItem: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cartItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: '#FFE6F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemPrice: {
    fontSize: 15,
    color: '#ff69b4',
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
    color: '#333',
    minWidth: 25,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  summaryCard: {
    marginTop: 10,
    borderRadius: 12,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#555',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    marginVertical: 10,
    backgroundColor: '#ddd',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff69b4',
  },
  checkoutButton: {
    backgroundColor: '#ff69b4',
    marginVertical: 16,
    borderRadius: 30,
    paddingVertical: 8,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#ff69b4',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  scheduleInfo: {
    textAlign: 'center',
    color: '#777',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
