import { Share, Platform } from 'react-native';
import { Product } from '../types/Product';
import { sendEmail } from '../utils/emailUtils';
import { WishlistService } from './WishlistService';
import { FirebaseService } from './FirebaseService';
import { User } from '../types/User';

export class SocialService {
  private static instance: SocialService;
  private firebaseService: FirebaseService;
  private wishlistService: WishlistService;

  private constructor() {
    this.firebaseService = FirebaseService.getInstance();
    this.wishlistService = WishlistService.getInstance();
  }

  public static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  /**
   * Compartilha um produto nas redes sociais
   */
  public async shareProduct(product: Product): Promise<void> {
    try {
      const baseUrl = 'https://acucaradas.com.br/produto/';
      const shareUrl = `${baseUrl}${product.id}`;

      const result = await Share.share({
        message: `Confira este delicioso ${product.nome} na Açucaradas Encomendas! ${shareUrl}`,
        title: `Açucaradas Encomendas - ${product.nome}`,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        if (__DEV__) {
          console.log('Produto compartilhado com sucesso');
        }
      } else if (result.action === Share.dismissedAction) {
        if (__DEV__) {
          console.log('Compartilhamento cancelado');
        }
      }
    } catch (error) {
      console.error('Erro ao compartilhar produto:', error);
      throw error;
    }
  }

  /**
   * Convida amigos por email
   */
  public async inviteFriends(
    currentUser: User,
    emails: string[],
    message?: string
  ): Promise<boolean> {
    try {
      const defaultMessage = `Olá! ${currentUser.name} convidou você para conhecer a Açucaradas Encomendas. 
      Visite nossa loja online e descubra os doces mais deliciosos da cidade!`;

      const emailContent = {
        subject: 'Convite para conhecer a Açucaradas Encomendas',
        body: message || defaultMessage,
        toAddresses: emails,
      };

      await sendEmail(emailContent);

      // Registra o convite para analytics
      await this.firebaseService.addDocument('convites', {
        usuarioId: currentUser.id,
        emailsConvidados: emails,
        data: new Date(),
        mensagemPersonalizada: !!message,
      });

      return true;
    } catch (error) {
      console.error('Erro ao enviar convites:', error);
      return false;
    }
  }

  /**
   * Compartilha uma lista de desejos
   */
  public async shareWishlist(userId: string): Promise<void> {
    try {
      const wishlist = await this.wishlistService.getWishlistByUserId(userId);

      if (!wishlist || wishlist.items.length === 0) {
        throw new Error('Lista de desejos vazia ou não encontrada');
      }

      const baseUrl = 'https://acucaradas.com.br/lista-desejos/';
      const shareUrl = `${baseUrl}${wishlist.id}`;

      const result = await Share.share({
        message: `Confira minha lista de desejos na Açucaradas Encomendas! ${shareUrl}`,
        title: 'Minha Lista de Desejos - Açucaradas Encomendas',
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        if (__DEV__) {
          console.log('Lista de desejos compartilhada com sucesso');
        }
      } else if (result.action === Share.dismissedAction) {
        if (__DEV__) {
          console.log('Compartilhamento cancelado');
        }
      }
    } catch (error) {
      console.error('Erro ao compartilhar lista de desejos:', error);
      throw error;
    }
  }

  /**
   * Obtém lista de desejos compartilhável
   */
  public async getSharedWishlist(wishlistId: string): Promise<any> {
    try {
      const wishlistRef = await this.firebaseService.getDocumentById('wishlists', wishlistId);

      if (!wishlistRef.exists) {
        throw new Error('Lista de desejos não encontrada');
      }

      const wishlistData = wishlistRef.data();

      // Verificar se a lista é compartilhável
      if (!wishlistData.isPublic) {
        throw new Error('Esta lista de desejos não é pública');
      }

      // Buscar informações detalhadas dos produtos
      const products = await Promise.all(
        wishlistData.items.map(async (item: any) => {
          const productRef = await this.firebaseService.getDocumentById('produtos', item.productId);
          return productRef.exists ? productRef.data() : null;
        })
      );

      return {
        ...wishlistData,
        products: products.filter(p => p !== null),
      };
    } catch (error) {
      console.error('Erro ao obter lista de desejos compartilhada:', error);
      throw error;
    }
  }
}
