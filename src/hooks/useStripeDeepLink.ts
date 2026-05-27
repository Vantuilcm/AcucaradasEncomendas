import { useEffect } from 'react';
import { Linking } from 'react-native';
import { navigate, navigationRef } from '../services/RootNavigation';

/** Paths aceitos após return_url Stripe (Hosting freeze — sem alterar backend). */
const STRIPE_RETURN_MARKERS = ['stripe/success', 'stripe/onboarding-complete'];

function isStripeReturnDeepLink(url: string): boolean {
  if (!url || !url.startsWith('acucaradas://')) return false;
  const path = url.replace(/^acucaradas:\/\//i, '').split('?')[0];
  return STRIPE_RETURN_MARKERS.some((marker) => path === marker || path.startsWith(`${marker}/`));
}

function handleStripeReturnUrl(url: string) {
  if (!isStripeReturnDeepLink(url)) return;

  console.log('[STRIPE_DEEPLINK] retorno recebido', { url });

  const goToContaBancaria = () => {
    if (navigationRef.isReady()) {
      navigate('ContaBancaria');
    }
  };

  goToContaBancaria();

  if (!navigationRef.isReady()) {
    [300, 800, 1500].forEach((ms) => setTimeout(goToContaBancaria, ms));
  }
}

/**
 * Escuta deep links de retorno do Stripe (stripe-success Hosting).
 * Não altera onboarding, functions nem URLs do accountLinks.create.
 */
export function useStripeDeepLink() {
  useEffect(() => {
    const onUrl = ({ url }: { url: string }) => handleStripeReturnUrl(url);
    const subscription = Linking.addEventListener('url', onUrl);

    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) handleStripeReturnUrl(initialUrl);
      })
      .catch(() => undefined);

    return () => subscription.remove();
  }, []);
}
