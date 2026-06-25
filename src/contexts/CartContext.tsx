import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Alert } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { CartService, CartItem, Cart } from '../services/CartService';

export type AddItemResponse =
  | { success: true; swapped?: boolean }
  | { success: false; reason: 'DIFFERENT_PRODUCER' | 'CANCELLED' };

interface CartContextType {
  cart: Cart;
  isLoading: boolean;
  itemCount: number;
  cartTotal: number;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<AddItemResponse>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  updateItemNotes: (itemId: string, notes: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cartService = new CartService();

  const [cart, setCart] = useState<Cart>({ items: [], lastUpdated: new Date().toISOString() });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [itemCount, setItemCount] = useState<number>(0);
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [swapSnackbarVisible, setSwapSnackbarVisible] = useState(false);

  const syncCartState = useCallback(async (updatedCart: Cart) => {
    setCart(updatedCart);
    const count = updatedCart.items.reduce((total, item) => total + item.quantity, 0);
    setItemCount(count);
    const total = await cartService.getCartTotal();
    setCartTotal(total);
  }, []);

  // Função para carregar o carrinho do armazenamento local
  const loadCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentCart = await cartService.getCart();
      if (currentCart && currentCart.items) {
        await syncCartState(currentCart);
      }
    } catch (error) {
      console.error('Erro crítico ao carregar carrinho:', error);
      setCart({ items: [], lastUpdated: new Date().toISOString() });
      setItemCount(0);
      setCartTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [syncCartState]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const promptProducerSwap = (item: Omit<CartItem, 'id'>): Promise<AddItemResponse> =>
    new Promise(resolve => {
      Alert.alert(
        'Trocar de loja',
        'Seu carrinho possui produtos de outra loja.\n\nDeseja limpar o carrinho para comprar nesta loja?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve({ success: false, reason: 'CANCELLED' }),
          },
          {
            text: 'Trocar de Loja',
            onPress: async () => {
              try {
                await cartService.clearCart();
                setCart({ items: [], lastUpdated: new Date().toISOString() });
                setItemCount(0);
                setCartTotal(0);

                const retry = await cartService.addItem(item);
                if (retry.success) {
                  await syncCartState(retry.cart);
                  setSwapSnackbarVisible(true);
                  resolve({ success: true, swapped: true });
                } else {
                  resolve({ success: false, reason: 'DIFFERENT_PRODUCER' });
                }
              } catch (error) {
                console.error('Erro ao trocar loja do carrinho:', error);
                resolve({ success: false, reason: 'CANCELLED' });
              }
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve({ success: false, reason: 'CANCELLED' }) }
      );
    });

  const addItem = async (item: Omit<CartItem, 'id'>): Promise<AddItemResponse> => {
    try {
      setIsLoading(true);
      const result = await cartService.addItem(item);

      if (!result.success && result.reason === 'DIFFERENT_PRODUCER') {
        return promptProducerSwap(item);
      }

      if (result.success) {
        await syncCartState(result.cart);
        return { success: true };
      }

      return { success: false, reason: 'DIFFERENT_PRODUCER' };
    } catch (error) {
      console.error('Erro ao adicionar item ao carrinho:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      setIsLoading(true);
      const updatedCart = await cartService.updateQuantity(itemId, quantity);
      await syncCartState(updatedCart);
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setIsLoading(true);
      const updatedCart = await cartService.removeItem(itemId);
      await syncCartState(updatedCart);
    } catch (error) {
      console.error('Erro ao remover item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setIsLoading(true);
      await cartService.clearCart();
      setCart({ items: [], lastUpdated: new Date().toISOString() });
      setItemCount(0);
      setCartTotal(0);
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemNotes = async (itemId: string, notes: string) => {
    try {
      setIsLoading(true);
      const updatedCart = await cartService.updateItemNotes(itemId, notes);
      setCart(updatedCart);
    } catch (error) {
      console.error('Erro ao atualizar observações:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCart = async () => {
    await loadCart();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        itemCount,
        cartTotal,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        updateItemNotes,
        refreshCart,
      }}
    >
      {children}
      <Snackbar
        visible={swapSnackbarVisible}
        onDismiss={() => setSwapSnackbarVisible(false)}
        duration={3000}
      >
        Carrinho atualizado para a nova loja.
      </Snackbar>
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }

  return context;
};
