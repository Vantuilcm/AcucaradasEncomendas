import { Share, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import { Product } from '../types/Product';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from './LoggingService';

// Chave para armazenamento da lista de desejos
const WISHLIST_STORAGE_KEY = 'user_wishlist_';

// Interface para item da lista de desejos
export interface WishlistItem {
  productId: string;
  dateAdded: number;
  isPublic: boolean; // se está compartilhado publicamente
  notes?: string; // notas do usuário sobre o produto
}

export class SocialSharingService {
  private static instance: SocialSharingService;

  private constructor() {}

  public static getInstance(): SocialSharingService {
    if (!SocialSharingService.instance) {
      SocialSharingService.instance = new SocialSharingService();
    }
    return SocialSharingService.instance;
  }

  /**
   * Compartilha um produto nas redes sociais
   */
  public async shareProduct(product: Product): Promise<boolean> {
    try {
      const url = this.generateShareableLink(product);
      const title = `Açucaradas Encomendas - ${product.nome}`;
      const message = `Olha o que encontrei na Açucaradas Encomendas: ${product.nome}! ${product.descricao} Por apenas R$ ${product.preco.toFixed(2)}. Confira: ${url}`;

      // Compartilhamento nativo
      const result = await Share.share({
        title,
        message,
        url: Platform.OS === 'ios' ? url : undefined, // url só funciona no iOS
      });

      if (result.action === Share.sharedAction) {
        loggingService.info('Produto compartilhado com sucesso', { productId: product.id });
        return true;
      }

      return false;
    } catch (error) {
      loggingService.error('Erro ao compartilhar produto', { error, productId: product.id });
      return false;
    }
  }

  /**
   * Compartilha uma imagem do produto
   */
  public async shareProductImage(product: Product): Promise<boolean> {
    try {
      if (!product.imagens || product.imagens.length === 0) {
        return false;
      }

      // Verificar se o compartilhamento é disponível
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Compartilhamento não disponível neste dispositivo');
      }

      // Obter primeira imagem
      const imageUrl = product.imagens[0];

      // Baixar a imagem para compartilhar
      const fileUri = `${FileSystem.cacheDirectory}temp_${product.id}.jpg`;
      await FileSystem.downloadAsync(imageUrl, fileUri);

      // Compartilhar a imagem
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Compartilhar ${product.nome}`,
        UTI: 'public.jpeg',
      });

      // Limpar o arquivo temporário
      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      loggingService.info('Imagem do produto compartilhada', { productId: product.id });
      return true;
    } catch (error) {
      loggingService.error('Erro ao compartilhar imagem do produto', {
        error,
        productId: product.id,
      });
      return false;
    }
  }

  /**
   * Gera um link compartilhável para o produto
   */
  private generateShareableLink(product: Product): string {
    const path = `product/${product.id}`;
    return Linking.createURL(path);
  }

  /**
   * Convida amigos para o app usando compartilhamento nativo
   */
  public async inviteFriends(message?: string): Promise<boolean> {
    try {
      const appUrl = Linking.createURL('');
      const defaultMessage = `Estou usando o app Açucaradas Encomendas para comprar doces deliciosos! Baixe agora e ganhe 10% de desconto no primeiro pedido: ${appUrl}`;

      const shareMessage = message || defaultMessage;

      const result = await Share.share({
        title: 'Convide seus amigos para a Açucaradas Encomendas',
        message: shareMessage,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      loggingService.error('Erro ao convidar amigos', { error });
      return false;
    }
  }

  /**
   * Adiciona um produto à lista de desejos do usuário
   */
  public async addToWishlist(
    userId: string,
    productId: string,
    isPublic: boolean = false,
    notes?: string
  ): Promise<boolean> {
    try {
      // Obter lista atual
      const currentList = await this.getWishlist(userId);

      // Verificar se o produto já está na lista
      if (currentList.some(item => item.productId === productId)) {
        return true; // Produto já está na lista
      }

      // Criar novo item
      const wishlistItem: WishlistItem = {
        productId,
        dateAdded: Date.now(),
        isPublic,
        notes,
      };

      // Adicionar à lista e salvar
      const updatedList = [...currentList, wishlistItem];
      await AsyncStorage.setItem(`${WISHLIST_STORAGE_KEY}${userId}`, JSON.stringify(updatedList));

      loggingService.info('Produto adicionado à lista de desejos', { userId, productId });
      return true;
    } catch (error) {
      loggingService.error('Erro ao adicionar produto à lista de desejos', {
        error,
        userId,
        productId,
      });
      return false;
    }
  }

  /**
   * Remove um produto da lista de desejos
   */
  public async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      // Obter lista atual
      const currentList = await this.getWishlist(userId);

      // Filtrar o produto a ser removido
      const updatedList = currentList.filter(item => item.productId !== productId);

      // Salvar lista atualizada
      await AsyncStorage.setItem(`${WISHLIST_STORAGE_KEY}${userId}`, JSON.stringify(updatedList));

      loggingService.info('Produto removido da lista de desejos', { userId, productId });
      return true;
    } catch (error) {
      loggingService.error('Erro ao remover produto da lista de desejos', {
        error,
        userId,
        productId,
      });
      return false;
    }
  }

  /**
   * Obtém a lista de desejos do usuário
   */
  public async getWishlist(userId: string): Promise<WishlistItem[]> {
    try {
      const wishlist = await AsyncStorage.getItem(`${WISHLIST_STORAGE_KEY}${userId}`);
      return wishlist ? JSON.parse(wishlist) : [];
    } catch (error) {
      loggingService.error('Erro ao obter lista de desejos', { error, userId });
      return [];
    }
  }

  /**
   * Verifica se um produto está na lista de desejos
   */
  public async isInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const wishlist = await this.getWishlist(userId);
      return wishlist.some(item => item.productId === productId);
    } catch (error) {
      loggingService.error('Erro ao verificar lista de desejos', { error, userId, productId });
      return false;
    }
  }

  /**
   * Compartilha a lista de desejos do usuário
   */
  public async shareWishlist(userId: string, userName: string): Promise<boolean> {
    try {
      // Obter lista de desejos
      const wishlist = await this.getWishlist(userId);

      // Filtrar apenas os itens públicos
      const publicItems = wishlist.filter(item => item.isPublic);

      if (publicItems.length === 0) {
        return false;
      }

      // Gerar link para a lista compartilhada
      const wishlistUrl = Linking.createURL(`wishlist/${userId}`);

      // Criar mensagem de compartilhamento
      const message = `${userName} compartilhou uma lista de desejos de doces deliciosos na Açucaradas Encomendas. Confira: ${wishlistUrl}`;

      // Compartilhar
      const result = await Share.share({
        title: 'Lista de Desejos - Açucaradas Encomendas',
        message,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      loggingService.error('Erro ao compartilhar lista de desejos', { error, userId });
      return false;
    }
  }

  /**
   * Define a visibilidade de um item da lista de desejos
   */
  public async setWishlistItemVisibility(
    userId: string,
    productId: string,
    isPublic: boolean
  ): Promise<boolean> {
    try {
      // Obter lista atual
      const currentList = await this.getWishlist(userId);

      // Encontrar e atualizar o item
      const updatedList = currentList.map(item => {
        if (item.productId === productId) {
          return { ...item, isPublic };
        }
        return item;
      });

      // Salvar lista atualizada
      await AsyncStorage.setItem(`${WISHLIST_STORAGE_KEY}${userId}`, JSON.stringify(updatedList));

      return true;
    } catch (error) {
      loggingService.error('Erro ao atualizar visibilidade do item', { error, userId, productId });
      return false;
    }
  }

  /**
   * Atualiza as notas de um item da lista de desejos
   */
  public async updateWishlistItemNotes(
    userId: string,
    productId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      // Obter lista atual
      const currentList = await this.getWishlist(userId);

      // Encontrar e atualizar o item
      const updatedList = currentList.map(item => {
        if (item.productId === productId) {
          return { ...item, notes };
        }
        return item;
      });

      // Salvar lista atualizada
      await AsyncStorage.setItem(`${WISHLIST_STORAGE_KEY}${userId}`, JSON.stringify(updatedList));

      return true;
    } catch (error) {
      loggingService.error('Erro ao atualizar notas do item', { error, userId, productId });
      return false;
    }
  }
}

export default SocialSharingService;
