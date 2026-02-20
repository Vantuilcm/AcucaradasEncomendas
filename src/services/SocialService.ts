import { Share, Platform } from 'react-native';
import { Product } from '../types/Product';
import { sendEmail } from '../utils/emailUtils';
import { WishlistService } from './WishlistService';
import { FirebaseService } from './FirebaseService';
import { User } from '../models/User';
import { LoggingService } from './LoggingService';

const logger = LoggingService.getInstance();

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
      const baseUrl = 'https://acucaradasencomendas.com.br/produto/';
      const shareUrl = `${baseUrl}${product.id}`;

      const result = await Share.share({
        message: `Confira este delicioso ${product.nome} na Açucaradas Encomendas! ${shareUrl}`,
        title: `Açucaradas Encomendas - ${product.nome}`,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        logger.debug('Produto compartilhado com sucesso');
      } else if (result.action === Share.dismissedAction) {
        logger.debug('Compartilhamento cancelado');
      }
    } catch (error) {
      logger.error('Erro ao compartilhar produto', { productId: product.id, error });
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
        userId: currentUser.id,
        emailsConvidados: emails,
        data: new Date(),
        mensagemPersonalizada: !!message,
      });

      return true;
    } catch (error) {
      logger.error('Erro ao enviar convites', { userId: currentUser.id, emails, error });
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

      const baseUrl = 'https://acucaradasencomendas.com.br/lista-desejos/';
      const shareUrl = `${baseUrl}${wishlist.id}`;

      const result = await Share.share({
        message: `Confira minha lista de desejos na Açucaradas Encomendas! ${shareUrl}`,
        title: 'Minha Lista de Desejos - Açucaradas Encomendas',
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        logger.debug('Lista de desejos compartilhada com sucesso');
      } else if (result.action === Share.dismissedAction) {
        logger.debug('Compartilhamento cancelado');
      }
    } catch (error) {
      logger.error('Erro ao compartilhar lista de desejos', { userId, error });
      throw error;
    }
  }

  /**
   * Obtém lista de desejos compartilhável
   */
  public async getSharedWishlist(wishlistId: string): Promise<any> {
    try {
      const wishlistRef = await this.firebaseService.getDocumentById('wishlists', wishlistId);

      if (!wishlistRef.exists()) {
        throw new Error('Lista de desejos não encontrada');
      }

      const wishlistData = wishlistRef.data() as any;

      // Verificar se a lista é compartilhável
      if (!wishlistData || !wishlistData.isPublic) {
        throw new Error('Esta lista de desejos não é pública');
      }

      // Buscar informações detalhadas dos produtos
      const itemsArray = Array.isArray((wishlistData as any).items) ? (wishlistData as any).items : [];
      const products = await Promise.all(
        itemsArray.map(async (item: any) => {
          const productRef = await this.firebaseService.getDocumentById('produtos', item.productId);
          return (productRef as any).exists ? (productRef as any).data() : null;
        })
      );return {
        ...wishlistData,
        products: products.filter((p: any) => p !== null),
      };
    } catch (error) {
      logger.error('Erro ao obter lista de desejos compartilhada', { wishlistId, error });
      throw error;
    }
  }
}




