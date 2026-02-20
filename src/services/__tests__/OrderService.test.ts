import { OrderService } from '../OrderService';
import { PaymentService } from '../PaymentService';
import { NotificationService } from '../NotificationService';

jest.mock('../PaymentService');
jest.mock('../NotificationService');

describe('OrderService', () => {
  let orderService: OrderService;
  let paymentService: PaymentService;
  let notificationService: NotificationService;

  beforeEach(() => {
    orderService = OrderService.getInstance();
    paymentService = PaymentService.getInstance();
    notificationService = NotificationService.getInstance();
    jest.clearAllMocks();
  });

  describe('criarPedido', () => {
    it('deve criar um pedido com sucesso', async () => {
      const dadosPedido = {
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
        dadosCartao: {
          numero: '4242424242424242',
          expiracao: '12/25',
          cvv: '123',
          nome: 'Cliente Teste',
        },
      };

      const resultado = await orderService.criarPedido(dadosPedido);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.status).toBe('pendente');
      expect(resultado.valorTotal).toBe(50);
    });

    it('deve rejeitar pedido sem itens', async () => {
      const dadosPedido = {
        cliente: {
          nome: 'Cliente Teste',
          email: 'cliente@exemplo.com',
          telefone: '(11) 99999-9999',
        },
        itens: [],
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
        dadosCartao: {
          numero: '4242424242424242',
          expiracao: '12/25',
          cvv: '123',
          nome: 'Cliente Teste',
        },
      };

      await expect(orderService.criarPedido(dadosPedido)).rejects.toThrow(
        'Pedido deve conter pelo menos um item'
      );
    });

    it('deve rejeitar pedido com valor total zero', async () => {
      const dadosPedido = {
        cliente: {
          nome: 'Cliente Teste',
          email: 'cliente@exemplo.com',
          telefone: '(11) 99999-9999',
        },
        itens: [
          {
            produto: 'Bolo de Chocolate',
            quantidade: 1,
            preco: 0,
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
        dadosCartao: {
          numero: '4242424242424242',
          expiracao: '12/25',
          cvv: '123',
          nome: 'Cliente Teste',
        },
      };

      await expect(orderService.criarPedido(dadosPedido)).rejects.toThrow(
        'Valor total do pedido deve ser maior que zero'
      );
    });
  });

  describe('consultarPedido', () => {
    it('deve consultar um pedido existente', async () => {
      const idPedido = 'ped_123';
      const resultado = await orderService.consultarPedido(idPedido);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idPedido);
      expect(resultado.status).toBe('pendente');
    });

    it('deve retornar erro para pedido inexistente', async () => {
      const idPedido = 'ped_inexistente';
      await expect(orderService.consultarPedido(idPedido)).rejects.toThrow('Pedido não encontrado');
    });
  });

  describe('atualizarStatusPedido', () => {
    it('deve atualizar o status de um pedido com sucesso', async () => {
      const idPedido = 'ped_123';
      const novoStatus = 'em_preparo';
      const resultado = await orderService.atualizarStatusPedido(idPedido, novoStatus);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idPedido);
      expect(resultado.status).toBe(novoStatus);
    });

    it('deve retornar erro ao tentar atualizar pedido inexistente', async () => {
      const idPedido = 'ped_inexistente';
      const novoStatus = 'em_preparo';
      await expect(orderService.atualizarStatusPedido(idPedido, novoStatus)).rejects.toThrow(
        'Pedido não encontrado'
      );
    });

    it('deve retornar erro ao tentar atualizar para status inválido', async () => {
      const idPedido = 'ped_123';
      const novoStatus = 'status_invalido';
      await expect(orderService.atualizarStatusPedido(idPedido, novoStatus)).rejects.toThrow(
        'Status inválido'
      );
    });
  });

  describe('cancelarPedido', () => {
    it('deve cancelar um pedido com sucesso', async () => {
      const idPedido = 'ped_123';
      const resultado = await orderService.cancelarPedido(idPedido);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idPedido);
      expect(resultado.status).toBe('cancelado');
    });

    it('deve retornar erro ao tentar cancelar pedido inexistente', async () => {
      const idPedido = 'ped_inexistente';
      await expect(orderService.cancelarPedido(idPedido)).rejects.toThrow('Pedido não encontrado');
    });

    it('deve retornar erro ao tentar cancelar pedido já cancelado', async () => {
      const idPedido = 'ped_cancelado';
      await expect(orderService.cancelarPedido(idPedido)).rejects.toThrow(
        'Pedido já está cancelado'
      );
    });
  });

  describe('listarPedidos', () => {
    it('deve listar pedidos com sucesso', async () => {
      const filtros = {
        status: 'pendente',
        dataInicio: '2024-01-01',
        dataFim: '2024-12-31',
      };

      const resultado = await orderService.listarPedidos(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('deve retornar lista vazia quando não há pedidos', async () => {
      const filtros = {
        status: 'pendente',
        dataInicio: '2025-01-01',
        dataFim: '2025-12-31',
      };

      const resultado = await orderService.listarPedidos(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBe(0);
    });
  });

  describe('calcularValorTotal', () => {
    it('deve calcular o valor total do pedido corretamente', () => {
      const itens = [
        {
          produto: 'Bolo de Chocolate',
          quantidade: 2,
          preco: 50,
        },
        {
          produto: 'Cupcake',
          quantidade: 3,
          preco: 10,
        },
      ];

      const valorTotal = orderService.calcularValorTotal(itens);
      expect(valorTotal).toBe(130); // (2 * 50) + (3 * 10)
    });

    it('deve retornar zero para lista vazia de itens', () => {
      const itens = [];
      const valorTotal = orderService.calcularValorTotal(itens);
      expect(valorTotal).toBe(0);
    });
  });
});
