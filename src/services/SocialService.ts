import { db, f } from '../config/firebase';
import { Share } from 'react-native';
import { Product } from '../types/Product';
import { User } from '../models/User';
import { sendEmail } from '../utils/emailUtils';
import { WishlistService } from './WishlistService';

export class SocialService {
  private static instance: SocialService;
  private wishlistService: WishlistService;

  private constructor() {
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
      const defaultMessage = `Olá! ${currentUser.nome} convidou você para conhecer a Açucaradas Encomendas. 
      Visite nossa loja online e descubra os doces mais deliciosos da cidade!`;

      const emailContent = {
        subject: 'Convite para conhecer a Açucaradas Encomendas',
        body: message || defaultMessage,
        toAddresses: emails,
      };

      await sendEmail(emailContent);

      // Registra o convite para analytics
      await f.addDoc(f.collection(db, 'convites'), {
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
      const shareUrl = `${baseUrl}${userId}`;

      const result = await Share.share({
        message: `Confira minha lista de desejos na Açucaradas Encomendas! ${shareUrl}`,
        title: 'Minha Lista de Desejos',
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        if (__DEV__) {
          console.log('Lista de desejos compartilhada com sucesso');
        }
      }
    } catch (error) {
      console.error('Erro ao compartilhar lista de desejos:', error);
      throw error;
    }
  }

  /**
   * Registra uma recomendação de produto
   */
  public async recommendProduct(
    currentUser: User,
    productId: string,
    friendEmail: string
  ): Promise<void> {
    try {
      await f.addDoc(f.collection(db, 'recomendacoes'), {
        usuarioId: currentUser.id,
        produtoId: productId,
        emailAmigo: friendEmail,
        data: new Date(),
      });
    } catch (error) {
      console.error('Erro ao registrar recomendação:', error);
    }
  }
}

export const socialService = SocialService.getInstance();
