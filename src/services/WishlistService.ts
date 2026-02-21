import { FirebaseService } from './FirebaseService';
import { Product } from '../types/Product';

export interface WishlistItem {
  productId: string;
  dateAdded: Date;
}

export interface Wishlist {
  id: string;
  userId: string;
  name: string;
  items: WishlistItem[];
  isPublic: boolean;
  dateCreated: Date;
  dateUpdated: Date;
}

export class WishlistService {
  private static instance: WishlistService;
  private firebaseService: FirebaseService;

  private constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  public static getInstance(): WishlistService {
    if (!WishlistService.instance) {
      WishlistService.instance = new WishlistService();
    }
    return WishlistService.instance;
  }

  /**
   * Obtém a lista de desejos de um usuário
   */
  public async getWishlistByUserId(userId: string): Promise<Wishlist | null> {
    try {
      const querySnapshot = await this.firebaseService.getCollection('wishlists', [
        { field: 'userId', operator: '==', value: userId },
      ]);

      if (querySnapshot.empty) {
        // Criar uma lista de desejos padrão para o usuário
        const newWishlist: Omit<Wishlist, 'id'> = {
          userId,
          name: 'Minha Lista de Desejos',
          items: [],
          isPublic: false,
          dateCreated: new Date(),
          dateUpdated: new Date(),
        };

        const wishlistId = await this.firebaseService.addDocument('wishlists', newWishlist);
        return { id: wishlistId, ...newWishlist };
      }

      const wishlistDoc = querySnapshot.docs[0];
      return { id: wishlistDoc.id, ...wishlistDoc.data() } as Wishlist;
    } catch (error) {
      console.error('Erro ao buscar lista de desejos:', error);
      return null;
    }
  }

  /**
   * Adiciona um produto à lista de desejos
   */
  public async addToWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const wishlist = await this.getWishlistByUserId(userId);

      if (!wishlist) {
        throw new Error('Não foi possível encontrar ou criar a lista de desejos');
      }

      // Verificar se o produto já está na lista
      const exists = wishlist.items.some(item => item.productId === productId);

      if (exists) {
        return true; // Produto já está na lista
      }

      // Adicionar produto à lista
      const updatedItems = [
        ...wishlist.items,
        {
          productId,
          dateAdded: new Date(),
        },
      ];

      await this.firebaseService.updateDocument('wishlists', wishlist.id, {
        items: updatedItems,
        dateUpdated: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Erro ao adicionar produto à lista de desejos:', error);
      return false;
    }
  }

  /**
   * Remove um produto da lista de desejos
   */
  public async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const wishlist = await this.getWishlistByUserId(userId);

      if (!wishlist) {
        return false;
      }

      // Filtrar o produto a ser removido
      const updatedItems = wishlist.items.filter(item => item.productId !== productId);

      await this.firebaseService.updateDocument('wishlists', wishlist.id, {
        items: updatedItems,
        dateUpdated: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Erro ao remover produto da lista de desejos:', error);
      return false;
    }
  }

  /**
   * Verifica se um produto está na lista de desejos
   */
  public async isInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const wishlist = await this.getWishlistByUserId(userId);

      if (!wishlist) {
        return false;
      }

      return wishlist.items.some(item => item.productId === productId);
    } catch (error) {
      console.error('Erro ao verificar produto na lista de desejos:', error);
      return false;
    }
  }

  /**
   * Atualiza as configurações de privacidade da lista de desejos
   */
  public async updateWishlistPrivacy(userId: string, isPublic: boolean): Promise<boolean> {
    try {
      const wishlist = await this.getWishlistByUserId(userId);

      if (!wishlist) {
        return false;
      }

      await this.firebaseService.updateDocument('wishlists', wishlist.id, {
        isPublic,
        dateUpdated: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar privacidade da lista de desejos:', error);
      return false;
    }
  }

  /**
   * Obtém os produtos da lista de desejos
   */
  public async getWishlistProducts(userId: string): Promise<Product[]> {
    try {
      const wishlist = await this.getWishlistByUserId(userId);

      if (!wishlist || wishlist.items.length === 0) {
        return [];
      }

      // Obter detalhes de cada produto
      const products = await Promise.all(
        wishlist.items.map(async item => {
          const productRef = await this.firebaseService.getDocumentById('produtos', item.productId);
          return productRef.exists
            ? ({ id: productRef.id, ...productRef.data() } as Product)
            : null;
        })
      );

      return products.filter((product): product is Product => product !== null);
    } catch (error) {
      console.error('Erro ao obter produtos da lista de desejos:', error);
      return [];
    }
  }
}
