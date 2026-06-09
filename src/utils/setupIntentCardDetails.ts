import { STRIPE_PUBLISHABLE_KEY } from '../config/stripe';

export type SetupIntentCardDetails = {
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  paymentMethodId?: string;
};

type StripeRestCard = {
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
};

function extractSetupIntentId(clientSecret: string): string {
  const secretMarker = '_secret_';
  const idx = clientSecret.indexOf(secretMarker);
  return idx > 0 ? clientSecret.slice(0, idx) : clientSecret;
}

function mapRestCard(card: StripeRestCard): SetupIntentCardDetails | null {
  if (!card?.last4) return null;
  return {
    last4: card.last4,
    brand: card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Card',
    expiryMonth: card.exp_month || 1,
    expiryYear: card.exp_year || new Date().getFullYear(),
  };
}

function mapSdkCard(card: {
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
}): SetupIntentCardDetails | null {
  if (!card?.last4) return null;
  return {
    last4: card.last4,
    brand: card.brand || 'Card',
    expiryMonth: card.expMonth || 1,
    expiryYear: card.expYear || new Date().getFullYear(),
  };
}

async function stripeRestGet<T>(pathWithQuery: string): Promise<T> {
  if (!STRIPE_PUBLISHABLE_KEY) {
    throw new Error('Stripe publishable key não configurada');
  }

  const credentials = btoa(`${STRIPE_PUBLISHABLE_KEY}:`);
  const response = await fetch(`https://api.stripe.com${pathWithQuery}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || `Stripe REST ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

async function fetchPaymentMethodCard(paymentMethodId: string): Promise<SetupIntentCardDetails | null> {
  const paymentMethod = await stripeRestGet<{ card?: StripeRestCard }>(
    `/v1/payment_methods/${paymentMethodId}`
  );
  const mapped = mapRestCard(paymentMethod.card || {});
  return mapped ? { ...mapped, paymentMethodId } : null;
}

async function fetchExpandedSetupIntentCard(
  clientSecret: string
): Promise<SetupIntentCardDetails | null> {
  const setupIntentId = extractSetupIntentId(clientSecret);
  const setupIntent = await stripeRestGet<{
    payment_method?: string | { id?: string; card?: StripeRestCard };
  }>(
    `/v1/setup_intents/${setupIntentId}?client_secret=${encodeURIComponent(
      clientSecret
    )}&expand[]=payment_method`
  );

  const paymentMethod = setupIntent.payment_method;
  if (paymentMethod && typeof paymentMethod === 'object') {
    const mapped = mapRestCard(paymentMethod.card || {});
    return mapped
      ? { ...mapped, paymentMethodId: paymentMethod.id }
      : null;
  }

  if (typeof paymentMethod === 'string' && paymentMethod) {
    return fetchPaymentMethodCard(paymentMethod);
  }

  return null;
}

/**
 * Stripe RN SDK often returns setupIntent.paymentMethod = null on iOS after PaymentSheet,
 * while paymentMethodId remains populated. Official workaround: retrieve PM via Stripe REST
 * with publishable key (SetupIntent client_secret or PaymentMethod id).
 */
export async function resolveSetupIntentCardDetails(
  setupIntent: any,
  clientSecret: string
): Promise<SetupIntentCardDetails> {
  const sdkCard =
    setupIntent?.paymentMethod?.Card || setupIntent?.paymentMethod?.card;
  const fromSdk = mapSdkCard(sdkCard || {});
  if (fromSdk) {
    return {
      ...fromSdk,
      paymentMethodId:
        setupIntent?.paymentMethod?.id || setupIntent?.paymentMethodId || undefined,
    };
  }

  const paymentMethodId =
    setupIntent?.paymentMethodId || setupIntent?.paymentMethod?.id;

  if (paymentMethodId) {
    const fromPaymentMethod = await fetchPaymentMethodCard(paymentMethodId);
    if (fromPaymentMethod) return fromPaymentMethod;
  }

  const fromExpandedSetupIntent = await fetchExpandedSetupIntentCard(clientSecret);
  if (fromExpandedSetupIntent) return fromExpandedSetupIntent;

  throw new Error('Dados do cartão indisponíveis após confirmação');
}
