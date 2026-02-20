import { PaymentService } from '../PaymentService';
import { NotificationService } from '../NotificationService';

export class OrderService {
  private static instance: OrderService;
  private pedidos: Map<string, any>;

  private constructor() {
    this.pedidos = new Map();
    this.inicializarDadosTeste();
  }

  private inicializarDadosTeste() {
    // Pedido pendente
    this.pedidos.set('ped_123', {
      id: 'ped_123',
      cliente: {
        nome: 'Cliente Teste',
        email: 'cliente@exemplo.com',
        telefone: '(11) 99999-9999',
      },
      itens: [
        {
          produto: 'Bolo de Chocolate',
          quantidade: 1,
          preco: 50,
        },
      ],
      enderecoEntrega: {
        rua: 'Rua Teste',
        numero: '123',
        complemento: 'Apto 45',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01001-000',
      },
      formaPagamento: 'cartao',
      status: 'pendente',
      valorTotal: 50,
      data: new Date('2024-01-01'),
    });

    // Pedido cancelado
    this.pedidos.set('ped_cancelado', {
      id: 'ped_cancelado',
      cliente: {
        nome: 'Cliente Cancelado',
        email: 'cancelado@exemplo.com',
        telefone: '(11) 88888-8888',
      },
      itens: [
        {
          produto: 'Cupcake',
          quantidade: 2,
          preco: 10,
        },
      ],
      enderecoEntrega: {
        rua: 'Rua Cancelada',
        numero: '456',
        complemento: 'Casa',
        bairro: 'Jardim',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '02002-000',
      },
      formaPagamento: 'cartao',
      status: 'cancelado',
      valorTotal: 20,
      data: new Date('2024-01-02'),
    });
  }

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  public async criarPedido(dadosPedido: any): Promise<any> {
    const { itens } = dadosPedido;
    const valorTotal = this.calcularValorTotal(itens);

    if (!itens || itens.length === 0) {
      throw new Error('Pedido deve conter pelo menos um item');
    }

    if (valorTotal <= 0) {
      throw new Error('Valor total do pedido deve ser maior que zero');
    }

    const pedido = {
      id: `ped_${Date.now()}`,
      ...dadosPedido,
      status: 'pendente',
      valorTotal,
      data: new Date(),
    };

    this.pedidos.set(pedido.id, pedido);

    // Simular integração com serviços externos
    const paymentService = PaymentService.getInstance();
    const notificationService = NotificationService.getInstance();

    await paymentService.criarPagamento({
      valor: valorTotal,
      moeda: 'BRL',
      descricao: `Pagamento do pedido ${pedido.id}`,
      dadosCartao: dadosPedido.dadosCartao,
    });

    await notificationService.enviarNotificacao({
      titulo: 'Pedido Recebido',
      mensagem: `Seu pedido #${pedido.id} foi recebido com sucesso!`,
      destinatario: dadosPedido.cliente.email,
      tipo: 'email',
    });

    return pedido;
  }

  public async consultarPedido(idPedido: string): Promise<any> {
    const pedido = this.pedidos.get(idPedido);
    if (!pedido) {
      throw new Error('Pedido não encontrado');
    }
    return pedido;
  }

  public async atualizarStatusPedido(idPedido: string, novoStatus: string): Promise<any> {
    const pedido = await this.consultarPedido(idPedido);

    const statusValidos = [
      'pendente',
      'em_preparo',
      'pronto',
      'em_entrega',
      'entregue',
      'cancelado',
    ];
    if (!statusValidos.includes(novoStatus)) {
      throw new Error('Status inválido');
    }

    pedido.status = novoStatus;
    this.pedidos.set(idPedido, pedido);

    // Simular notificação de atualização de status
    const notificationService = NotificationService.getInstance();
    await notificationService.enviarNotificacao({
      titulo: 'Status do Pedido Atualizado',
      mensagem: `O status do seu pedido #${idPedido} foi atualizado para: ${novoStatus}`,
      destinatario: pedido.cliente.email,
      tipo: 'email',
    });

    return pedido;
  }

  public async cancelarPedido(idPedido: string): Promise<any> {
    const pedido = await this.consultarPedido(idPedido);

    if (pedido.status === 'cancelado') {
      throw new Error('Pedido já está cancelado');
    }

    pedido.status = 'cancelado';
    this.pedidos.set(idPedido, pedido);

    // Simular cancelamento de pagamento
    const paymentService = PaymentService.getInstance();
    await paymentService.cancelarPagamento(idPedido);

    // Simular notificação de cancelamento
    const notificationService = NotificationService.getInstance();
    await notificationService.enviarNotificacao({
      titulo: 'Pedido Cancelado',
      mensagem: `Seu pedido #${idPedido} foi cancelado com sucesso.`,
      destinatario: pedido.cliente.email,
      tipo: 'email',
    });

    return pedido;
  }

  public async listarPedidos(filtros?: any): Promise<any[]> {
    let pedidos = Array.from(this.pedidos.values());

    if (filtros) {
      if (filtros.status) {
        pedidos = pedidos.filter(pedido => pedido.status === filtros.status);
      }

      if (filtros.dataInicio) {
        const dataInicio = new Date(filtros.dataInicio);
        pedidos = pedidos.filter(pedido => pedido.data >= dataInicio);
      }

      if (filtros.dataFim) {
        const dataFim = new Date(filtros.dataFim);
        pedidos = pedidos.filter(pedido => pedido.data <= dataFim);
      }
    }

    return pedidos;
  }

  public calcularValorTotal(itens: any[]): number {
    return itens.reduce((total, item) => total + item.quantidade * item.preco, 0);
  }
}
