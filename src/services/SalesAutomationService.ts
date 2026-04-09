import { db, f } from '../config/firebase';
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
        triggeredAt: f.serverTimestamp(),
        status: 'pending',
        metadata
      };

      await f.addDoc(f.collection(db, this.collectionName), event);
      
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
      
      const q = f.query(
        f.collection(db, this.collectionName),
        f.where('eventType', '==', 'CHECKOUT_STARTED'),
        f.where('status', '==', 'pending'),
        f.where('triggeredAt', '<=', tenMinutesAgo)
      );

      const querySnapshot = await f.getDocs(q);
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
              title: "🍰 Esqueceu algo doce?",
              message: "Seu carrinho está esperando por você. Finalize agora e garanta sua encomenda!",
              priority: 'high',
              read: false
            });

            await f.updateDoc(f.doc(db, this.collectionName, eventId), {
              status: 'sent',
              updatedAt: f.serverTimestamp()
            });
            processed++;
          } catch (e: any) {
            loggingService.error('Erro ao enviar push de recuperação', { error: e.message });
          }
        }
      }
      
      if (processed > 0) {
        loggingService.info(`Automation: Recuperação concluída. ${processed} eventos processados.`);
      }
    } catch (error: any) {
      loggingService.error('Erro ao processar carrinhos abandonados', { error: error.message });
    }
  }

  /**
   * Resolve checkouts pendentes do usuário
   */
  private async resolvePendingCheckouts(userId: string): Promise<void> {
    try {
      const q = f.query(
        f.collection(db, this.collectionName),
        f.where('userId', '==', userId),
        f.where('eventType', '==', 'CHECKOUT_STARTED'),
        f.where('status', '==', 'pending')
      );
      
      const snapshot = await f.getDocs(q);
      const batch = f.writeBatch(db);
      
      snapshot.docs.forEach((docSnapshot: any) => {
        batch.update(docSnapshot.ref, {
          status: 'skipped', 
          resolvedAt: f.serverTimestamp() 
        });
      });
      
      await batch.commit();
    } catch (error: any) {
      loggingService.error('Erro ao resolver checkouts pendentes', { error: error.message });
    }
  }

  /**
   * Implementa regra anti-spam (Max 1 push per 12h)
   */
  private async checkAntiSpam(userId: string): Promise<boolean> {
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const q = f.query(
        f.collection(db, this.collectionName),
        f.where('userId', '==', userId),
        f.where('status', '==', 'sent'),
        f.where('triggeredAt', '>=', twelveHoursAgo),
        f.limit(1)
      );
      
      const snapshot = await f.getDocs(q);
      return snapshot.empty;
    } catch (error) {
      return false;
    }
  }
}

