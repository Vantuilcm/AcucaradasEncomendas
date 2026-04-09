import { db, f } from '../config/firebase';
import { User } from '../models/User';
import { Order } from '../types/Order';
import { NotificationService } from './NotificationService';
import { loggingService } from './LoggingService';

const { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, limit, orderBy } = f;

export interface ReferralLog {
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'expired';
  orderId?: string;
  valueGenerated?: number;
  createdAt: any;
}

export class GrowthService {
  private static instance: GrowthService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    loggingService.info('GrowthService: Iniciando motor de crescimento (Revenue First)');
  }

  public static getInstance(): GrowthService {
    if (!GrowthService.instance) {
      GrowthService.instance = new GrowthService();
    }
    return GrowthService.instance;
  }

  /**
   * Gera um código de indicação único para o usuário (Ex: JOAO123)
   */
  public generateReferralCode(userName: string): string {
    const prefix = userName.substring(0, 4).toUpperCase().replace(/\s/g, '');
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${suffix}`;
  }

  /**
   * Processa uma nova indicação quando o usuário se cadastra
   */
  public async applyReferral(newUserId: string, referralCode: string): Promise<boolean> {
    try {
      loggingService.info('Growth: Aplicando indicação...', { newUserId, referralCode });

      // 1. Buscar quem indicou
      const q = query(collection(db, 'usuarios'), where('referralCode', '==', referralCode), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        loggingService.warn('Growth: Código de indicação inválido', { referralCode });
        return false;
      }

      const referrerDoc = snapshot.docs[0];
      const referrerId = referrerDoc.id;

      if (referrerId === newUserId) {
        loggingService.warn('Growth: Usuário tentou indicar a si mesmo');
        return false;
      }

      // 2. Registrar o log de indicação
      const referralLog: Omit<ReferralLog, 'id'> = {
        referrerId,
        referredId: newUserId,
        referralCode,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'referrals'), referralLog);

      // 3. Atualizar o usuário indicado
      await updateDoc(doc(db, 'usuarios', newUserId), {
        referredBy: referrerId
      });

      // 4. Notificar quem indicou (Engajamento imediato)
      await this.notificationService.createNotification({
        userId: referrerId,
        type: 'promotion' as any,
        title: "🍰 Você tem uma nova indicação!",
        message: "Um amigo acabou de entrar. Quando ele fizer o primeiro pedido, você ganha um presente!",
        priority: 'high',
        read: false
      });

      return true;
    } catch (error: any) {
      loggingService.error('Growth: Erro ao aplicar indicação', { error: error.message });
      return false;
    }
  }

  /**
   * Growth Loop: Disparado após pedido concluído
   */
  public async triggerGrowthLoop(order: Order): Promise<void> {
    try {
      const userId = order.userId;
      
      // 1. Verificar se o pedido foi por indicação e completar o ciclo
      const userDoc = await getDocs(query(collection(db, 'usuarios'), where('id', '==', userId), limit(1)));
      const userData = userDoc.docs[0]?.data() as unknown as User;

      if (userData?.referredBy) {
        await this.completeReferralCycle(userData.referredBy, userId, order);
      }

      // 2. Enviar convite de indicação (Growth Loop)
      await this.notificationService.createNotification({
        userId,
        type: 'promotion' as any,
        title: "🍰 Amizade Doce",
        message: "Indique um amigo e ganhe 15% de desconto no seu próximo pedido! Use seu código.",
        priority: 'normal',
        read: false,
        data: { type: 'GROWTH_LOOP', referralCode: userData?.referralCode }
      });

      loggingService.info('Growth: Growth Loop disparado para usuário', { userId });
    } catch (error: any) {
      loggingService.error('Growth: Erro no growth loop', { error: error.message });
    }
  }

  /**
   * Finaliza o ciclo de indicação quando o indicado faz o primeiro pedido
   */
  private async completeReferralCycle(referrerId: string, referredId: string, order: Order): Promise<void> {
    try {
      // Buscar o log pendente
      const q = query(
        collection(db, 'referrals'),
        where('referrerId', '==', referrerId),
        where('referredId', '==', referredId),
        where('status', '==', 'pending'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const logId = snapshot.docs[0].id;

      // Atualizar log
      await updateDoc(doc(db, 'referrals', logId), {
        status: 'completed',
        orderId: order.id,
        valueGenerated: order.totalAmount,
        completedAt: serverTimestamp()
      });

      // Atualizar estatísticas do referrer
      const referrerRef = doc(db, 'usuarios', referrerId);
      const referrerSnap = await getDocs(query(collection(db, 'usuarios'), where('id', '==', referrerId), limit(1)));
      const referrerData = referrerSnap.docs[0]?.data() as unknown as User;

      await updateDoc(referrerRef, {
        referralCount: (referrerData?.referralCount || 0) + 1,
        totalReferralValue: (referrerData?.totalReferralValue || 0) + order.totalAmount
      });

      // Premiar quem indicou (Cupom Automático)
      await this.notificationService.createNotification({
        userId: referrerId,
        type: 'promotion' as any,
        title: "🎁 Seu Presente Chegou!",
        message: "Seu amigo fez um pedido! Você ganhou um cupom de 20% OFF: AMIGODOCE20",
        priority: 'high',
        read: false,
        data: { type: 'REFERRAL_REWARD', coupon: 'AMIGODOCE20' }
      });

      loggingService.info('Growth: Ciclo de indicação completado', { referrerId, referredId });
    } catch (error: any) {
      loggingService.error('Growth: Erro ao completar ciclo', { error: error.message });
    }
  }

  /**
   * Reengajamento: 7 dias sem comprar
   */
  public async processReengagement(): Promise<void> {
    try {
      loggingService.info('Growth: Verificando reengajamento (7 dias)...');
      
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Buscar usuários que não compram há 7 dias (simplificado: baseado no último pedido ou data de criação)
      const q = query(
        collection(db, 'usuarios'),
        where('role', '==', 'customer'),
        limit(50) // Processar em lotes
      );

      const querySnapshot = await getDocs(q);
      let reengaged = 0;

      for (const docSnapshot of querySnapshot.docs) {
        const userId = docSnapshot.id;
        
        // Verificar último pedido
        const lastOrderQ = query(
          collection(db, 'orders'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        
        const lastOrderSnap = await getDocs(lastOrderQ);
        let shouldReengage = false;

        if (lastOrderSnap.empty) {
          // Nunca comprou, verificar data de criação
          const userData = docSnapshot.data() as any;
          let createdAt: Date;
          
          if (userData.dataCriacao?.toDate) {
            createdAt = userData.dataCriacao.toDate();
          } else if (userData.dataCriacao) {
            createdAt = new Date(userData.dataCriacao);
          } else {
            createdAt = new Date(0);
          }
          
          if (createdAt < sevenDaysAgo) shouldReengage = true;
        } else {
          const lastOrder = lastOrderSnap.docs[0].data() as unknown as Order;
          const lastOrderDate = new Date(lastOrder.createdAt);
          if (lastOrderDate < sevenDaysAgo) shouldReengage = true;
        }

        if (shouldReengage) {
          // Anti-spam de 7 dias para reengajamento
          const canSend = await this.checkAntiSpamGrowth(userId, 'REENGAGEMENT_7D');
          
          if (canSend) {
            await this.notificationService.createNotification({
              userId,
              type: 'promotion' as any,
              title: "🍰 Saudades de um docinho?",
              message: "Faz tempo que não te vemos! Use o cupom VOLTOU20 e ganhe 20% de desconto hoje.",
              priority: 'high',
              read: false,
              data: { type: 'REENGAGEMENT_7D', coupon: 'VOLTOU20' }
            });

            await this.logGrowthEvent(userId, 'REENGAGEMENT_7D');
            reengaged++;
          }
        }
      }

      loggingService.info('Growth: Reengajamento concluído', { reengaged });
    } catch (error: any) {
      loggingService.error('Growth: Erro no reengajamento', { error: error.message });
    }
  }

  private async checkAntiSpamGrowth(userId: string, type: string): Promise<boolean> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'growth_events'),
      where('userId', '==', userId),
      where('eventType', '==', type),
      where('timestamp', '>=', sevenDaysAgo),
      limit(1)
    );
    const snap = await getDocs(q);
    return snap.empty;
  }

  private async logGrowthEvent(userId: string, eventType: string): Promise<void> {
    await addDoc(collection(db, 'growth_events'), {
      userId,
      eventType,
      timestamp: serverTimestamp()
    });
  }
}
