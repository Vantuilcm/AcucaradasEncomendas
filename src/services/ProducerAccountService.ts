import { f } from '../config/firebase';
import { OrderService } from './OrderService';
import {
  DEFAULT_USER_PREFERENCES,
  ProducerDocumentationData,
  ProducerWalletEntry,
  ProducerWalletSummary,
  UserPreferencesDoc,
} from '../types/ProducerAccount';

function computeProducerAmount(order: Record<string, unknown>): number {
  const explicit = order.producerAmount as number | undefined;
  if (typeof explicit === 'number' && !Number.isNaN(explicit)) {
    return explicit;
  }
  const totalAmount = (order.totalAmount as number) || 0;
  const deliveryFee = (order.deliveryFee as number) || 0;
  const productAmount = Math.max(0, totalAmount - deliveryFee);
  return Math.round(productAmount * 0.9);
}

function normalizePayoutStatus(order: Record<string, unknown>): 'paid' | 'pending' | 'failed' | 'other' {
  const status = String(order.payoutStatus || '').toLowerCase();
  if (status === 'paid') return 'paid';
  if (status === 'failed') return 'failed';
  if (status === 'pending' || status === 'missing_connected_account') return 'pending';
  if (order.status === 'delivered') return 'pending';
  return 'other';
}

function formatDateLabel(value: unknown): string {
  if (!value) return '—';
  try {
    const date =
      typeof value === 'object' && value !== null && 'toDate' in (value as object)
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
}

export class ProducerAccountService {
  private static instance: ProducerAccountService;

  static getInstance(): ProducerAccountService {
    if (!ProducerAccountService.instance) {
      ProducerAccountService.instance = new ProducerAccountService();
    }
    return ProducerAccountService.instance;
  }

  async getUserDoc(uid: string): Promise<Record<string, unknown> | null> {
    const snap = await f.getDoc(f.doc('users', uid));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  }

  async getWalletSummary(uid: string): Promise<ProducerWalletSummary> {
    const userDoc = await this.getUserDoc(uid);
    const orders = (await OrderService.getInstance().getOrders()).filter(
      (order) => order.producerId === uid
    );

    let availableBalance = 0;
    let pendingBalance = 0;
    let lastPayoutMs = 0;
    const entries: ProducerWalletEntry[] = [];

    for (const order of orders) {
      const raw = order as unknown as Record<string, unknown>;
      const amount = computeProducerAmount(raw);
      if (amount <= 0) continue;

      const payoutStatus = normalizePayoutStatus(raw);
      if (payoutStatus === 'paid') {
        availableBalance += amount;
      } else if (payoutStatus === 'pending') {
        pendingBalance += amount;
      }

      const payoutProcessedAt = raw.payoutProcessedAt;
      if (payoutStatus === 'paid' && payoutProcessedAt) {
        const ms =
          typeof payoutProcessedAt === 'object' &&
          payoutProcessedAt !== null &&
          'toDate' in (payoutProcessedAt as object)
            ? (payoutProcessedAt as { toDate: () => Date }).toDate().getTime()
            : new Date(String(payoutProcessedAt)).getTime();
        if (!Number.isNaN(ms)) lastPayoutMs = Math.max(lastPayoutMs, ms);
      }

      entries.push({
        id: order.id,
        orderId: order.id,
        label: `Pedido #${order.id.substring(0, 8)}`,
        amount,
        status: payoutStatus,
        date: order.updatedAt || order.createdAt,
      });
    }

    entries.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    const payoutsEnabled = userDoc?.payoutsEnabled === true;
    const hasMovements = entries.length > 0;

    return {
      availableBalance,
      pendingBalance,
      nextPayoutLabel:
        pendingBalance > 0
          ? payoutsEnabled
            ? 'Repasse em processamento via Stripe Connect'
            : 'Complete a verificação bancária para receber repasses'
          : '—',
      lastPayoutLabel: lastPayoutMs > 0 ? formatDateLabel(new Date(lastPayoutMs)) : '—',
      entries,
      hasMovements,
    };
  }

  async getDocumentation(uid: string, email: string | null): Promise<ProducerDocumentationData> {
    const userDoc = await this.getUserDoc(uid);
    const cpfCnpj =
      (userDoc?.cpf as string) ||
      (userDoc?.cnpj as string) ||
      (userDoc?.documento as string) ||
      (userDoc?.taxId as string) ||
      null;

    const detailsSubmitted = userDoc?.detailsSubmitted as boolean | null | undefined;
    const payoutsEnabled = userDoc?.payoutsEnabled as boolean | null | undefined;
    const chargesEnabled = userDoc?.chargesEnabled as boolean | null | undefined;

    let verificationLabel = 'Verificação pendente';
    if (detailsSubmitted && payoutsEnabled) {
      verificationLabel = 'Verificação concluída';
    } else if (detailsSubmitted) {
      verificationLabel = 'Documentos enviados — aguardando aprovação';
    }

    const currentlyDue = Array.isArray(userDoc?.stripeRequirementsDue)
      ? (userDoc?.stripeRequirementsDue as string[])
      : [];
    const eventuallyDue = Array.isArray(userDoc?.stripeRequirementsEventuallyDue)
      ? (userDoc?.stripeRequirementsEventuallyDue as string[])
      : [];

    return {
      name: String(userDoc?.nome || userDoc?.name || '—'),
      email: email || String(userDoc?.email || '—'),
      cpfCnpj,
      stripeAccountId: (userDoc?.stripeAccountId as string) || null,
      chargesEnabled: typeof chargesEnabled === 'boolean' ? chargesEnabled : null,
      payoutsEnabled: typeof payoutsEnabled === 'boolean' ? payoutsEnabled : null,
      detailsSubmitted: typeof detailsSubmitted === 'boolean' ? detailsSubmitted : null,
      verificationLabel,
      currentlyDue,
      eventuallyDue,
    };
  }

  async getUserPreferences(uid: string): Promise<UserPreferencesDoc> {
    const snap = await f.getDoc(f.doc('userPreferences', uid));
    if (!snap.exists()) {
      return { ...DEFAULT_USER_PREFERENCES };
    }
    const data = snap.data() as Partial<UserPreferencesDoc>;
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...data,
    };
  }

  async saveUserPreferences(uid: string, preferences: UserPreferencesDoc): Promise<void> {
    await f.setDoc(
      f.doc('userPreferences', uid),
      {
        pushNotifications: preferences.pushNotifications,
        whatsappNotifications: preferences.whatsappNotifications,
        emailNotifications: preferences.emailNotifications,
        promotions: preferences.promotions,
        newOrders: preferences.newOrders,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}
