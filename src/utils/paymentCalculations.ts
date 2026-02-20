/**
 * Utilitário centralizado para cálculos de taxas e split de pagamento.
 * Garante consistência entre Frontend e Backend.
 */

export interface PaymentSplit {
  subtotal: number;
  deliveryFee: number;
  platformMaintenanceFee: number;
  appCommission: number;
  appFee: number;
  producerAmount: number;
  total: number;
}

export const calculatePaymentSplit = (
  subtotal: number,
  deliveryFee: number,
  paymentMethod: 'credit_card' | 'pix' | 'money'
): PaymentSplit => {
  // Taxa de manutenção da plataforma
  const platformMaintenanceFee = paymentMethod === 'pix' ? 0.99 : 1.99;
  
  // Arredondamento para 2 casas decimais para evitar problemas de precisão
  const format = (val: number) => Number(val.toFixed(2));

  // 10% de comissão sobre o subtotal (produtos)
  const commissionRate = 0.10;
  const appCommission = format(subtotal * commissionRate);
  
  // App recebe comissão + taxa de manutenção
  const appFee = format(appCommission + platformMaintenanceFee);
  
  // Produtor recebe 90% do subtotal
  const producerAmount = format(subtotal - appCommission);
  
  // Total final do cliente
  const total = format(subtotal + deliveryFee + platformMaintenanceFee);

  return {
    subtotal: format(subtotal),
    deliveryFee: format(deliveryFee),
    platformMaintenanceFee,
    appCommission,
    appFee,
    producerAmount,
    total,
  };
};
