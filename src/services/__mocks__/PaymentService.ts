import { jest } from '@jest/globals';

export class PaymentService {
  private static instance: PaymentService;
  private pagamentos: Map<string, any>;

  private constructor() {
    this.pagamentos = new Map();
    // Inicializa alguns pagamentos de teste
    this.pagamentos.set('pag_123', {
      id: 'pag_123',
      valor: 100,
      moeda: 'BRL',
      descricao: 'Teste de pagamento',
      status: 'sucesso',
      data: '2024-01-01T00:00:00Z',
    });
    this.pagamentos.set('pag_cancelado', {
      id: 'pag_cancelado',
      valor: 200,
      moeda: 'BRL',
      descricao: 'Pagamento cancelado',
      status: 'cancelado',
      data: '2024-01-02T00:00:00Z',
    });
    this.pagamentos.set('pag_reembolsado', {
      id: 'pag_reembolsado',
      valor: 300,
      moeda: 'BRL',
      descricao: 'Pagamento reembolsado',
      status: 'reembolsado',
      data: '2024-01-03T00:00:00Z',
    });
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  criarPagamento = jest.fn().mockImplementation(async (dadosPagamento: any) => {
    if (dadosPagamento.valor <= 0) {
      throw new Error('Valor invÃ¡lido');
    }

    if (dadosPagamento.dadosCartao.numero === '4000000000000002') {
      throw new Error('CartÃ£o recusado');
    }

    const pagamento = {
      id: `pag_${Math.random().toString(36).substr(2, 9)}`,
      ...dadosPagamento,
      status: 'sucesso',
      data: new Date().toISOString(),
    };

    this.pagamentos.set(pagamento.id, pagamento);
    return pagamento;
  });

  consultarPagamento = jest.fn().mockImplementation(async (...args: any[]) => {
    const idPagamento = String(args[0] ?? '');
    const pagamento = this.pagamentos.get(idPagamento);
    if (!pagamento) {
      throw new Error('Pagamento nÃ£o encontrado');
    }
    return pagamento;
  });

  cancelarPagamento = jest.fn().mockImplementation(async (...args: any[]) => {
    const idPagamento = String(args[0] ?? '');
    const pagamento = this.pagamentos.get(idPagamento);
    if (!pagamento) {
      throw new Error('Pagamento nÃ£o encontrado');
    }

    if (pagamento.status === 'cancelado') {
      throw new Error('Pagamento jÃ¡ cancelado');
    }

    pagamento.status = 'cancelado';
    this.pagamentos.set(idPagamento, pagamento);
    return pagamento;
  });

  reembolsarPagamento = jest.fn().mockImplementation(async (...args: any[]) => {
    const idPagamento = String(args[0] ?? '');
    const pagamento = this.pagamentos.get(idPagamento);
    if (!pagamento) {
      throw new Error('Pagamento nÃ£o encontrado');
    }

    if (pagamento.status === 'reembolsado') {
      throw new Error('Pagamento jÃ¡ reembolsado');
    }

    pagamento.status = 'reembolsado';
    this.pagamentos.set(idPagamento, pagamento);
    return pagamento;
  });

  listarPagamentos = jest.fn().mockImplementation(async (filtros: any) => {
    let pagamentos = Array.from(this.pagamentos.values());

    if (filtros.dataInicio) {
      pagamentos = pagamentos.filter(p => p.data >= filtros.dataInicio);
    }

    if (filtros.dataFim) {
      pagamentos = pagamentos.filter(p => p.data <= filtros.dataFim);
    }

    if (filtros.status) {
      pagamentos = pagamentos.filter(p => p.status === filtros.status);
    }

    return pagamentos;
  });
}

export default PaymentService;

