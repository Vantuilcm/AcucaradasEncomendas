import { PaymentService } from '../PaymentService';

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = PaymentService.getInstance();
    jest.clearAllMocks();
  });

  describe('criarPagamento', () => {
    it('deve criar um pagamento com sucesso', async () => {
      const futureYear = String((new Date().getFullYear() + 2) % 100).padStart(2, '0');
      const dadosPagamento = {
        valor: 100,
        moeda: 'BRL',
        descricao: 'Teste de pagamento',
        metodoPagamento: 'cartao',
        dadosCartao: {
          numero: '4242424242424242',
          expiracao: `12/${futureYear}`,
          cvv: '123',
          nome: 'Teste Teste',
        },
      };

      const resultado = await paymentService.criarPagamento(dadosPagamento);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.status).toBe('sucesso');
    });

    it('deve rejeitar pagamento com cartão inválido', async () => {
      const futureYear = String((new Date().getFullYear() + 2) % 100).padStart(2, '0');
      const dadosPagamento = {
        valor: 100,
        moeda: 'BRL',
        descricao: 'Teste de pagamento',
        metodoPagamento: 'cartao_invalido',
        dadosCartao: {
          numero: '4000000000000002',
          expiracao: `12/${futureYear}`,
          cvv: '123',
          nome: 'Teste Teste',
        },
      };

      await expect(paymentService.criarPagamento(dadosPagamento)).rejects.toThrow(
        'Cartão recusado'
      );
    });

    it('deve rejeitar pagamento com valor inválido', async () => {
      const futureYear = String((new Date().getFullYear() + 2) % 100).padStart(2, '0');
      const dadosPagamento = {
        valor: -100,
        moeda: 'BRL',
        descricao: 'Teste de pagamento',
        metodoPagamento: 'cartao',
        dadosCartao: {
          numero: '4242424242424242',
          expiracao: `12/${futureYear}`,
          cvv: '123',
          nome: 'Teste Teste',
        },
      };

      await expect(paymentService.criarPagamento(dadosPagamento)).rejects.toThrow('Valor inválido');
    });
  });

  describe('consultarPagamento', () => {
    it('deve consultar um pagamento existente', async () => {
      const idPagamento = 'pag_123';
      const resultado = await paymentService.consultarPagamento(idPagamento);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idPagamento);
      expect(resultado.status).toBe('sucesso');
    });

    it('deve retornar erro para pagamento inexistente', async () => {
      const idPagamento = 'pag_inexistente';
      await expect(paymentService.consultarPagamento(idPagamento)).rejects.toThrow(
        'Pagamento não encontrado'
      );
    });
  });

  describe('cancelarPagamento', () => {
    it('deve cancelar um pagamento com sucesso', async () => {
      const idPagamento = 'pag_123';
      const resultado = await paymentService.cancelarPagamento(idPagamento);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idPagamento);
      expect(resultado.status).toBe('cancelado');
    });

    it('deve retornar erro ao tentar cancelar pagamento inexistente', async () => {
      const idPagamento = 'pag_inexistente';
      await expect(paymentService.cancelarPagamento(idPagamento)).rejects.toThrow(
        'Pagamento não encontrado'
      );
    });

    it('deve retornar erro ao tentar cancelar pagamento já cancelado', async () => {
      const idPagamento = 'pag_cancelado';
      await expect(paymentService.cancelarPagamento(idPagamento)).rejects.toThrow(
        'Pagamento já cancelado'
      );
    });
  });

  describe('reembolsarPagamento', () => {
    it('deve reembolsar um pagamento com sucesso', async () => {
      const idPagamento = 'pag_123';
      const resultado = await paymentService.reembolsarPagamento(idPagamento);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idPagamento);
      expect(resultado.status).toBe('reembolsado');
    });

    it('deve retornar erro ao tentar reembolsar pagamento inexistente', async () => {
      const idPagamento = 'pag_inexistente';
      await expect(paymentService.reembolsarPagamento(idPagamento)).rejects.toThrow(
        'Pagamento não encontrado'
      );
    });

    it('deve retornar erro ao tentar reembolsar pagamento já reembolsado', async () => {
      const idPagamento = 'pag_reembolsado';
      await expect(paymentService.reembolsarPagamento(idPagamento)).rejects.toThrow(
        'Pagamento já reembolsado'
      );
    });
  });

  describe('listarPagamentos', () => {
    it('deve listar pagamentos com sucesso', async () => {
      const filtros = {
        dataInicio: '2024-01-01',
        dataFim: '2024-12-31',
        status: 'sucesso',
      };

      const resultado = await paymentService.listarPagamentos(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('deve retornar lista vazia quando não há pagamentos', async () => {
      const filtros = {
        dataInicio: '2025-01-01',
        dataFim: '2025-12-31',
        status: 'sucesso',
      };

      const resultado = await paymentService.listarPagamentos(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBe(0);
    });
  });
});
