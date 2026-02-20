/**
 * Serviço de gerenciamento de navegação pendente.
 * Utilizado para enfileirar navegações que ocorrem antes do Router estar pronto (ex: notificações).
 */

type PendingEntry = { href: string; timestamp: number };

let pending: PendingEntry | null = null;
const MAX_PENDING_AGE_MS = 30_000;

/**
 * Define uma rota para ser navegada assim que o Router estiver pronto.
 * @param href O caminho da rota (ex: /detalhes-pedido/123)
 */
export function setPendingHref(href: string) {
  console.log('[PendingNav] Definindo rota pendente:', href);
  pending = { href, timestamp: Date.now() };
}

/**
 * Consome a rota pendente, retornando-a e limpando a fila.
 * @returns O href pendente ou null se não houver.
 */
export function consumePendingHref(): string | null {
  if (!pending) return null;

  const age = Date.now() - pending.timestamp;
  if (age > MAX_PENDING_AGE_MS) {
    pending = null;
    return null;
  }

  const href = pending.href;
  console.log('[PendingNav] Consumindo rota pendente:', href);
  pending = null;
  return href;
}

/**
 * Verifica se existe uma rota pendente sem consumi-la.
 */
export function hasPendingHref(): boolean {
  return pending !== null && Date.now() - pending.timestamp <= MAX_PENDING_AGE_MS;
}

export function clearPendingHref(): void {
  pending = null;
}
