import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from './LoggingService';

export interface CartItem {
  id: string;
  productId: string;
  producerId: string; // ID do produtor associado ao produto
  name: string;
  price: number;
  quantity: number;
  image: string;
  options?: {
    id: string;
    name: string;
    price: number;
  }[];
  notes?: string;
}

export interface Cart {
  items: CartItem[];
  lastUpdated: string;
}

export class CartService {
  private readonly CART_STORAGE_KEY = 'acucaradas:cart';

  // Obter o carrinho atual do AsyncStorage
  async getCart(): Promise<Cart> {
    try {
      const cartData = await AsyncStorage.getItem(this.CART_STORAGE_KEY);

      if (!cartData) {
        return { items: [], lastUpdated: new Date().toISOString() };
      }

      return JSON.parse(cartData) as Cart;
    } catch (error) {
      loggingService.error(
        'Erro ao obter carrinho',
        error instanceof Error ? error : undefined
      );
      return { items: [], lastUpdated: new Date().toISOString() };
    }
  }

  /**
   * Alias para getCart para compatibilidade
   */
  public async obterCarrinho(): Promise<Cart> {
    return this.getCart();
  }

  // Salvar o carrinho no AsyncStorage
  private async saveCart(cart: Cart): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.CART_STORAGE_KEY,
        JSON.stringify({
          ...cart,
          lastUpdated: new Date().toISOString(),
        })
      );
    } catch (error) {
      loggingService.error(
        'Erro ao salvar carrinho',
        error instanceof Error ? error : undefined
      );
      throw new Error('Não foi possível salvar o carrinho');
    }
  }

  // Adicionar item ao carrinho
  async addItem(item: Omit<CartItem, 'id'>): Promise<Cart> {
    try {
      const cart = await this.getCart();

      // Verificar se já existe um item idêntico (mesmo produto e mesmas opções)
      const existingItemIndex = cart.items.findIndex(cartItem => {
        if (cartItem.productId !== item.productId) return false;

        // Verificar se as opções são as mesmas
        if (!item.options && !cartItem.options) return true;
        if (!item.options || !cartItem.options) return false;
        if (item.options.length !== cartItem.options.length) return false;

        // Comparar cada opção
        const itemOptionIds = item.options.map(opt => opt.id).sort();
        const cartOptionIds = cartItem.options.map(opt => opt.id).sort();

        return JSON.stringify(itemOptionIds) === JSON.stringify(cartOptionIds);
      });

      if (existingItemIndex >= 0) {
        // Aumentar a quantidade se o item já existe
        cart.items[existingItemIndex].quantity += item.quantity;
      } else {
        // Adicionar novo item com ID único
        const newItem: CartItem = {
          ...item,
          id: `cart_item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        };

        cart.items.push(newItem);
      }

      await this.saveCart(cart);
      return cart;
    } catch (error) {
      loggingService.error(
        'Erro ao adicionar item ao carrinho',
        error instanceof Error ? error : undefined,
        { productId: item.productId, quantity: item.quantity }
      );
      throw error;
    }
  }

  /**
   * Alias para addItem para compatibilidade
   */
  public async adicionarItem(item: Omit<CartItem, 'id'>): Promise<Cart> {
    return this.addItem(item);
  }

  // Atualizar quantidade de um item
  async updateQuantity(itemId: string, quantity: number): Promise<Cart> {
    try {
      const cart = await this.getCart();

      const itemIndex = cart.items.findIndex(item => item.id === itemId);

      if (itemIndex === -1) {
        throw new Error('Item não encontrado no carrinho');
      }

      // Remover item se quantidade for 0 ou menor
      if (quantity <= 0) {
        return this.removeItem(itemId);
      }

      cart.items[itemIndex].quantity = quantity;
      await this.saveCart(cart);

      return cart;
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar quantidade do item',
        error instanceof Error ? error : undefined,
        { itemId, quantity }
      );
      throw error;
    }
  }

  /**
   * Alias para updateQuantity para compatibilidade
   */
  public async atualizarQuantidade(itemId: string, quantity: number): Promise<Cart> {
    return this.updateQuantity(itemId, quantity);
  }

  // Remover item do carrinho
  async removeItem(itemId: string): Promise<Cart> {
    try {
      const cart = await this.getCart();

      const updatedItems = cart.items.filter(item => item.id !== itemId);

      const updatedCart: Cart = {
        ...cart,
        items: updatedItems,
      };

      await this.saveCart(updatedCart);
      return updatedCart;
    } catch (error) {
      loggingService.error(
        'Erro ao remover item do carrinho',
        error instanceof Error ? error : undefined,
        { itemId }
      );
      throw error;
    }
  }

  /**
   * Alias para removeItem para compatibilidade
   */
  public async removerItem(itemId: string): Promise<Cart> {
    return this.removeItem(itemId);
  }

  // Atualizar observações do item
  async updateItemNotes(itemId: string, notes: string): Promise<Cart> {
    try {
      const cart = await this.getCart();

      const itemIndex = cart.items.findIndex(item => item.id === itemId);

      if (itemIndex === -1) {
        throw new Error('Item não encontrado no carrinho');
      }

      cart.items[itemIndex].notes = notes;
      await this.saveCart(cart);

      return cart;
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar observações do item',
        error instanceof Error ? error : undefined,
        { itemId }
      );
      throw error;
    }
  }

  /**
   * Alias para updateItemNotes para compatibilidade
   */
  public async atualizarNotasItem(itemId: string, notes: string): Promise<Cart> {
    return this.updateItemNotes(itemId, notes);
  }

  // Limpar o carrinho
  async clearCart(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CART_STORAGE_KEY);
    } catch (error) {
      loggingService.error(
        'Erro ao limpar carrinho',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Alias para clearCart para compatibilidade
   */
  public async limparCarrinho(): Promise<void> {
    return this.clearCart();
  }

  // Calcular o total do carrinho
  async getCartTotal(): Promise<number> {
    try {
      const cart = await this.getCart();

      return cart.items.reduce((total, item) => {
        let itemTotal = item.price * item.quantity;

        // Adicionar preço das opções
        if (item.options && item.options.length > 0) {
          const optionsTotal = item.options.reduce((sum, option) => sum + option.price, 0);
          itemTotal += optionsTotal * item.quantity;
        }

        return total + itemTotal;
      }, 0);
    } catch (error) {
      loggingService.error(
        'Erro ao calcular total do carrinho',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Alias para getCartTotal para compatibilidade
   */
  public async obterTotalCarrinho(): Promise<number> {
    return this.getCartTotal();
  }

  // Verificar se o carrinho está vazio
  async isCartEmpty(): Promise<boolean> {
    try {
      const cart = await this.getCart();
      return cart.items.length === 0;
    } catch (error) {
      loggingService.error(
        'Erro ao verificar se o carrinho está vazio',
        error instanceof Error ? error : undefined
      );
      return true;
    }
  }

  /**
   * Alias para isCartEmpty para compatibilidade
   */
  public async estaVazio(): Promise<boolean> {
    return this.isCartEmpty();
  }

  // Obter a quantidade total de itens no carrinho
  async getItemCount(): Promise<number> {
    try {
      const cart = await this.getCart();
      return cart.items.reduce((count, item) => count + item.quantity, 0);
    } catch (error) {
      loggingService.error(
        'Erro ao obter quantidade de itens',
        error instanceof Error ? error : undefined
      );
      return 0;
    }
  }

  /**
   * Alias para getItemCount para compatibilidade
   */
  public async obterContagemItens(): Promise<number> {
    return this.getItemCount();
  }
}
