import React from 'react';
import { Button, IconButton } from 'react-native-paper';
import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order } from '../types/Order';
import { formatCurrency } from '../utils/formatters';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

interface PrintOrderButtonProps {
  order: Order;
  compact?: boolean;
}

export const PrintOrderButton = ({ order, compact = false }: PrintOrderButtonProps) => {
  // Função para formatar a data no padrão brasileiro
  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Gerar o HTML para impressão do pedido
  const generateOrderHTML = () => {
    // Preparar itens do pedido para exibição no HTML
    const itemsHTML = order.items
      .map(
        item => `
      <tr>
        <td>${item.quantity}x</td>
        <td>${item.name}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.totalPrice)}</td>
      </tr>
    `
      )
      .join('');

    // Informações de agendamento (se existir)
    let scheduledInfoHTML = '';
    if (order.isScheduledOrder && order.scheduledDelivery) {
      const scheduledDate = new Date(order.scheduledDelivery.date);
      const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      let timeInfo = '';
      if (order.scheduledDelivery.type === 'scheduled') {
        timeInfo = `Entre ${order.scheduledDelivery.timeSlot?.replace(' - ', ' e ')}`;
      } else {
        timeInfo = `Horário específico: ${order.scheduledDelivery.customTime}`;
      }

      scheduledInfoHTML = `
        <div class="section">
          <h2>Informações da Entrega Agendada</h2>
          <p><strong>Data de Entrega:</strong> ${formattedDate}</p>
          <p><strong>Horário:</strong> ${timeInfo}</p>
          <p><strong>Tempo de Preparo:</strong> ${order.scheduledDelivery.preparationHours} hora${order.scheduledDelivery.preparationHours > 1 ? 's' : ''}</p>
          ${
            order.scheduledDelivery.specialInstructions
              ? `<p><strong>Instruções Especiais:</strong> ${order.scheduledDelivery.specialInstructions}</p>`
              : ''
          }
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pedido #${order.id.substring(0, 6)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 15px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #FF69B4;
            }
            .order-number {
              font-size: 18px;
              margin: 10px 0;
            }
            .section {
              margin-bottom: 20px;
              border-bottom: 1px solid #eee;
              padding-bottom: 15px;
            }
            h2 {
              color: #FF69B4;
              font-size: 18px;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            table th, table td {
              padding: 8px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background-color: #f5f5f5;
            }
            .total {
              font-weight: bold;
              font-size: 16px;
              margin-top: 10px;
              text-align: right;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Açucaradas Encomendas</div>
            <div class="order-number">Pedido #${order.id.substring(0, 6)}</div>
            <div>Data: ${formatDate(order.createdAt)}</div>
            <div>Status: ${getOrderStatusText(order.status)}</div>
          </div>
          
          <div class="section">
            <h2>Itens do Pedido</h2>
            <table>
              <thead>
                <tr>
                  <th>Qtd</th>
                  <th>Produto</th>
                  <th>Preço Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
            <div class="total">Total: ${formatCurrency(order.totalAmount)}</div>
          </div>
          
          ${scheduledInfoHTML}
          
          <div class="section">
            <h2>Dados da Entrega</h2>
            <p>
              <strong>Endereço:</strong> ${order.deliveryAddress.street}, ${order.deliveryAddress.number}
              ${order.deliveryAddress.complement ? `, ${order.deliveryAddress.complement}` : ''}
            </p>
            <p>
              <strong>Bairro:</strong> ${order.deliveryAddress.neighborhood}
            </p>
            <p>
              <strong>Cidade/UF:</strong> ${order.deliveryAddress.city} - ${order.deliveryAddress.state}
            </p>
            <p>
              <strong>CEP:</strong> ${order.deliveryAddress.zipCode}
            </p>
            ${
              order.deliveryAddress.reference
                ? `<p><strong>Referência:</strong> ${order.deliveryAddress.reference}</p>`
                : ''
            }
          </div>
          
          <div class="section">
            <h2>Pagamento</h2>
            <p><strong>Forma de Pagamento:</strong> ${getPaymentMethodText(order.paymentMethod.type)}</p>
          </div>
          
          <div class="footer">
            <p>Obrigado por escolher a Açucaradas Encomendas!</p>
            <p>Em caso de dúvidas, entre em contato pelo telefone (11) 99999-9999</p>
          </div>
        </body>
      </html>
    `;
  };

  const getOrderStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'preparing':
        return 'Em Preparação';
      case 'ready':
        return 'Pronto';
      case 'delivering':
        return 'Em Entrega';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getPaymentMethodText = (type: string): string => {
    switch (type) {
      case 'credit_card':
        return 'Cartão de Crédito';
      case 'debit_card':
        return 'Cartão de Débito';
      case 'money':
        return 'Dinheiro';
      case 'pix':
        return 'PIX';
      default:
        return type;
    }
  };

  const handlePrint = async () => {
    try {
      const html = generateOrderHTML();

      if (Platform.OS === 'web') {
        // No ambiente web, abrir uma nova janela para impressão
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
          newWindow.print();
        }
      } else {
        // Em dispositivos móveis, gerar um PDF
        const { uri } = await Print.printToFileAsync({ html });

        // Verificar se o compartilhamento está disponível
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          // Alternativa caso o compartilhamento não esteja disponível
          await Share.share({
            url: uri,
            title: `Pedido #${order.id.substring(0, 6)}`,
          });
        }
      }
    } catch (error) {
      logger.error('Erro ao imprimir pedido:', error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Renderizar botão compacto (apenas ícone) ou padrão
  if (compact) {
    return <IconButton icon="printer" size={24} onPress={handlePrint} iconColor="#FF69B4" />;
  }

  return (
    <Button
      mode="outlined"
      icon="printer"
      onPress={handlePrint}
      style={{ borderColor: '#FF69B4' }}
      textColor="#FF69B4"
    >
      Imprimir Pedido
    </Button>
  );
};
