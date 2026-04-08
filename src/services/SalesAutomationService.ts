import { f } from '../config/firebase';
const { collection, addDoc, query, where, getDocs, limit, updateDoc, doc, serverTimestamp } = f;
import { db } from '../config/firebase';
import { NotificationService } from './NotificationService';
import { loggingService } from './LoggingService';
import { GrowthService } from './GrowthService';

export type AutomationEventType = 'CHECKOUT_STARTED' | 'CART_ABANDONED' | 'PAYMENT_FAILED' | 'PROMO_TRIGGERED' | 'PAYMENT_SUCCESS';

export interface AutomationEvent {
  id: string;
  userId: string;
  eventType: AutomationEventType;
  triggeredAt: any;
  status: 'pending' | 'sent' | 'skipped' | 'failed';
  metadata?: any;
}

export class SalesAutomationService {
  private static instance: SalesAutomationService;
  private readonly collectionName = 'sales_automation_events';
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    loggingService.info('SalesAutomationService inicializado (Hybrid Client/Server mode)');
  }

  public static getInstance(): SalesAutomationService {
    if (!SalesAutomationService.instance) {
      SalesAutomationService.instance = new SalesAutomationService();
    }
    return SalesAutomationService.instance;
  }

  /**
   * Registra um novo evento de automação
   */
  public async logAutomationEvent(userId: string, eventType: AutomationEventType, metadata: any = {}): Promise<void> {
    try {
      const event = {
        userId,
        eventType,
        triggeredAt: serverTimestamp(),
        status: 'pending',
        metadata
      };

      await addDoc(collection(db, this.collectionName), event);
      
      // Se for sucesso de pagamento, podemos marcar eventos anteriores de checkout como resolvidos
      if (eventType === 'PAYMENT_SUCCESS') {
        await this.resolvePendingCheckouts(userId);
      }
    } catch (error: any) {
      loggingService.error('Erro ao logar evento de automação', { userId, eventType, error: error.message });
    }
  }

  /**
   * Ponto de entrada para todas as automações de vendas e crescimento
   */
  public async runAutomations(): Promise<void> {
    await this.processAbandonedCarts();
    await GrowthService.getInstance().processReengagement();
  }

  /**
   * Processa recuperações de carrinho abandonado
   */
  public async processAbandonedCarts(): Promise<void> {
    try {
      loggingService.info('Automation: Iniciando verificação de carrinhos abandonados...');
      
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const q = query(
        collection(db, this.collectionName),
        where('eventType', '==', 'CHECKOUT_STARTED'),
        where('status', '==', 'pending'),
        where('triggeredAt', '<=', tenMinutesAgo)
      );

      const querySnapshot = await getDocs(q);
      let processed = 0;

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        if (!data) continue;

        const event = { id: docSnapshot.id, ...data } as unknown as AutomationEvent;
        const eventId = docSnapshot.id;

        // Anti-spam: Máximo 1 push a cada 12h
        const canSend = await this.checkAntiSpam(event.userId);
        
        if (canSend) {
          try {
            await this.notificationService.createNotification({
              userId: event.userId,
              type: 'promotion' as any,
              title: "🍰 Seu pedido está te esperando",
              message: "Finalize agora antes que acabe seu doce favorito!",
              priority: 'high',
              read: false,
              data: { type: 'CART_RECOVERY', ...event.metadata }
            });

            await updateDoc(doc(db, this.collectionName, eventId), {
              status: 'sent',
              processedAt: serverTimestamp()
            });
            processed++;
          } catch (err) {
            await updateDoc(doc(db, this.collectionName, eventId), { status: 'failed' });
          }
        } else {
          await updateDoc(doc(db, this.collectionName, eventId), { status: 'skipped', reason: 'anti-spam' });
        }
      }

      loggingService.info('Automation: Processamento concluído', { processed });
    } catch (error: any) {
      loggingService.error('Automation: Erro no processamento', { error: error.message });
    }
  }

  /**
   * Verifica se o usuário pode receber notificação (Regra de 12h)
   */
  private async checkAntiSpam(userId: string): Promise<boolean> {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 1000 * 60);
    
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('status', '==', 'sent'),
      where('triggeredAt', '>=', twelveHoursAgo),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return snapshot.empty;
  }

  private async resolvePendingCheckouts(userId: string): Promise<void> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('eventType', '==', 'CHECKOUT_STARTED'),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    for (const docSnapshot of snapshot.docs) {
      const docRef = doc(db, this.collectionName, docSnapshot.id);
      await updateDoc(docRef, { status: 'skipped', reason: 'payment_completed' });
    }
  }
}

