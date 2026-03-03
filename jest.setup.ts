import dotenv from 'dotenv';
import { PaymentService } from '@/services/PaymentService';
import { NotificationService } from '@/services/NotificationService';
import { OrderService } from '@/services/OrderService';
import { ValidationService } from '@/services/validationService';
import { AuthService } from '@/services/AuthService';
import { ProductService } from '@/services/ProductService';

// Carrega variáveis de ambiente do arquivo .env.test
dotenv.config({ path: '.env.test' });

// Configuração global para testes
process.env.STRIPE_SECRET_KEY = 'test_stripe_secret_key';
process.env.STRIPE_PUBLISHABLE_KEY = 'test_stripe_publishable_key';
process.env.STRIPE_MERCHANT_ID = 'test_merchant_id';

// Configuração do timeout global para testes
jest.setTimeout(10000);

// Limpa todos os mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Configuração do console para não poluir os logs dos testes
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

// Mock para módulos que não podem ser testados no ambiente de teste
jest.mock('expo-constants', () => ({
  default: {
    manifest: {
      extra: {
        apiUrl: 'http://localhost:3000',
      },
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)), // Retorna null por padrão (cache miss)
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])), // Retorna array vazio por padrão
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// Configuração de mocks globais
global.fetch = jest.fn();
global.File = jest.fn();
global.Blob = jest.fn();
global.URL = {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn(),
};

// Configuração de mocks para validação
jest.mock('@/services/ValidationService', () => ({
  ValidationService: {
    getInstance: jest.fn().mockReturnValue({
      validarDadosPedido: jest.fn().mockImplementation(pedido => {
        if (
          !pedido ||
          !pedido.clienteId ||
          !pedido.itens ||
          pedido.itens.length === 0 ||
          !pedido.enderecoEntrega
        ) {
          return false;
        }
        // Validação básica dos itens
        const itensValidos = pedido.itens.every(
          item => item.produtoId && item.quantidade > 0 && item.precoUnitario >= 0
        );
        if (!itensValidos) {
          return false;
        }
        return true;
      }),
      validarDadosPagamento: jest.fn().mockImplementation(pagamento => {
        if (
          !pagamento ||
          !pagamento.pedidoId ||
          !pagamento.valor ||
          pagamento.valor <= 0 ||
          !pagamento.metodoPagamento
        ) {
          return false;
        }
        return true;
      }),
      validarCartao: jest.fn().mockImplementation(cartao => {
        if (
          !cartao ||
          !cartao.numero ||
          cartao.numero.length !== 16 ||
          !cartao.expiracao ||
          !cartao.cvv ||
          cartao.cvv.length < 3 ||
          !cartao.nome
        ) {
          return false;
        }
        const dateRegex = /^(0[1-9]|1[0-2])\/(\d{2})$/;
        if (!dateRegex.test(cartao.expiracao)) {
          return false;
        }
        return true;
      }),
      validarCliente: jest.fn().mockImplementation(cliente => {
        if (!cliente || !cliente.nome || !cliente.email || !cliente.telefone) {
          return false;
        }
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email);
        const telefoneLimpo = cliente.telefone.replace(/\D/g, '');
        const telefoneValido = telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11;
        return emailValido && telefoneValido;
      }),
      validatePasswordStrength: jest.fn().mockImplementation(password => {
        // Forte: 8+ caracteres, letra maiúscula, minúscula, número
        const strongRegex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})');
        return !!password && strongRegex.test(password);
      }),
      validateCPF: jest.fn().mockImplementation(cpf => {
        // Simulação mais realista (verifica apenas 11 dígitos)
        const cleaned = cpf ? cpf.replace(/\D/g, '') : '';
        return cleaned.length === 11;
        // Uma validação real de CPF seria muito mais complexa
      }),
      validateEmail: jest.fn().mockImplementation(email => {
        // Regex padrão para email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !!email && emailRegex.test(email);
      }),
      validatePhone: jest.fn().mockImplementation(phone => {
        // Verifica 10 ou 11 dígitos numéricos
        const cleaned = phone ? phone.replace(/\D/g, '') : '';
        return cleaned.length === 10 || cleaned.length === 11;
      }),
      validateAddress: jest.fn().mockImplementation(address => {
        // Verifica se campos obrigatórios existem E não estão vazios
        // Adiciona validação de formato para CEP
        const cepRegex = /^\d{5}-?\d{3}$/;
        return (
          !!address &&
          !!address.street &&
          address.street.trim() !== '' &&
          !!address.number &&
          address.number.trim() !== '' &&
          !!address.city &&
          address.city.trim() !== '' &&
          !!address.state &&
          address.state.trim() !== '' &&
          !!address.zipCode &&
          cepRegex.test(address.zipCode)
        );
      }),
    }),
  },
  validateFaceImage: jest.fn().mockImplementation(async image => {
    if (!image || !(typeof image === 'string') || !image.startsWith('data:image/')) {
      throw new Error('Imagem inválida');
    }
    return true;
  }),
  validateDocument: jest.fn().mockImplementation(async (type, document) => {
    if (!document || !document.buffer) {
      throw new Error('Documento inválido');
    }
    return true;
  }),
}));

// Configuração de mocks para autenticação
jest.mock('@/services/AuthService', () => ({
  AuthService: {
    getInstance: jest.fn().mockReturnValue({
      registrarUsuario: jest.fn().mockImplementation(dados => {
        if (!dados.email || !dados.senha) {
          throw new Error('Email e senha são obrigatórios');
        }
        return {
          id: 'user_123',
          email: dados.email,
          nome: dados.nome || 'Usuário',
          dataCriacao: new Date(),
          status: 'ativo',
        };
      }),
      autenticarUsuario: jest.fn().mockImplementation((email, senha) => {
        if (email === 'teste@email.com' && senha === 'senha123') {
          return {
            token: 'token_123',
            usuario: {
              id: 'user_123',
              email,
              nome: 'Usuário Teste',
              dataCriacao: new Date(),
              status: 'ativo',
            },
          };
        }
        throw new Error('Credenciais inválidas');
      }),
      atualizarSenha: jest.fn().mockImplementation((userId, senhaAtual, novaSenha) => {
        if (userId === 'user_123' && senhaAtual === 'senha123') {
          return true;
        }
        throw new Error('Usuário não encontrado ou senha atual incorreta');
      }),
      recuperarSenha: jest.fn().mockImplementation(email => {
        if (email === 'teste@email.com') {
          return {
            token: 'reset_token_123',
            expiracao: new Date(Date.now() + 3600000), // 1 hora
          };
        }
        throw new Error('Usuário não encontrado');
      }),
      redefinirSenha: jest.fn().mockImplementation((token, novaSenha) => {
        if (token === 'reset_token_123') {
          return true;
        }
        throw new Error('Token inválido ou expirado');
      }),
      validarToken: jest.fn().mockImplementation(token => {
        if (token === 'token_123') {
          return {
            id: 'user_123',
            email: 'teste@email.com',
            nome: 'Usuário Teste',
            dataCriacao: new Date(),
            status: 'ativo',
          };
        }
        throw new Error('Token inválido');
      }),
      deslogarUsuario: jest.fn().mockImplementation(userId => {
        if (userId === 'user_123') {
          return true;
        }
        throw new Error('Usuário não encontrado');
      }),
    }),
  },
}));

// Configuração de mocks para pagamentos
jest.mock('@/services/PaymentService', () => ({
  PaymentService: {
    getInstance: jest.fn().mockReturnValue({
      criarPagamento: jest.fn().mockImplementation(async dados => {
        if (!dados.valor || dados.valor <= 0) {
          return Promise.reject(new Error('Valor inválido'));
        }
        if (dados.metodoPagamento === 'cartao_invalido') {
          return Promise.reject(new Error('Cartão recusado'));
        }
        return Promise.resolve({
          id: 'pag_123',
          data: new Date(),
          valor: dados.valor,
          metodoPagamento: dados.metodoPagamento || 'cartao',
          status: 'sucesso',
        });
      }),
      consultarPagamento: jest.fn().mockImplementation(id => {
        if (id === 'pag_123') {
          return {
            id: 'pag_123',
            data: new Date(),
            valor: 100,
            metodoPagamento: 'cartao',
            status: 'sucesso', // Alterado para sucesso
          };
        }
        throw new Error('Pagamento não encontrado');
      }),
      cancelarPagamento: jest.fn().mockImplementation(id => {
        if (id === 'pag_123') {
          // Simular que não pode cancelar pagamento já cancelado
          // (Assumindo que o mock de consultarPagamento retornaria status cancelado)
          // Este if pode precisar de ajuste se a lógica real for diferente
          // const pagamentoAtual = this.consultarPagamento(id); // Não podemos chamar this aqui
          // if (pagamentoAtual.status === 'cancelado') {
          //   throw new Error('Pagamento já cancelado');
          // }
          return {
            id: 'pag_123',
            data: new Date(),
            valor: 100,
            metodoPagamento: 'cartao',
            status: 'cancelado',
          };
        }
        throw new Error('Pagamento não encontrado');
      }),
      reembolsarPagamento: jest.fn().mockImplementation(id => {
        if (id === 'pag_123') {
          // Simular que não pode reembolsar pagamento já reembolsado
          // (Assumindo que o mock de consultarPagamento retornaria status reembolsado)
          // const pagamentoAtual = this.consultarPagamento(id); // Não podemos chamar this aqui
          // if (pagamentoAtual.status === 'reembolsado') {
          //   throw new Error('Pagamento já reembolsado');
          // }
          return {
            id: 'pag_123',
            data: new Date(),
            valor: 100,
            metodoPagamento: 'cartao',
            status: 'reembolsado',
          };
        }
        throw new Error('Pagamento não encontrado');
      }),
      listarPagamentos: jest.fn().mockImplementation(filtros => {
        // Revertendo para retornar array vazio por padrão
        return [];
      }),
      savePayment: jest.fn().mockImplementation(dados => {
        return {
          id: 'pag_123',
          data: new Date(),
          valor: dados.valor,
          metodoPagamento: dados.metodoPagamento || 'cartao',
          status: 'pendente',
        };
      }),
      getPaymentByPaymentId: jest.fn().mockImplementation(id => {
        if (id === 'pag_123') {
          return {
            id: 'pag_123',
            data: new Date(),
            valor: 100,
            metodoPagamento: 'cartao',
            status: 'pendente',
          };
        }
        return null;
      }),
      updatePaymentStatus: jest.fn().mockImplementation((id, status) => {
        if (id === 'pag_123') {
          return {
            id: 'pag_123',
            data: new Date(),
            valor: 100,
            metodoPagamento: 'cartao',
            status,
          };
        }
        return null;
      }),
      getUserPayments: jest.fn().mockImplementation(userId => {
        return [];
      }),
      processCreditCardPayment: jest.fn().mockImplementation(async (orderId, cardDetails) => {
        // Simular sucesso por padrão
        // Aqui, idealmente, chamaríamos a simulação de sendPaymentConfirmation
        // que está no mock do NotificationService. Para simplificar, retornamos true.
        const notificationService =
          require('@/services/NotificationService').NotificationService.getInstance();
        const orderData = { customerId: 'CUSTOMER_123' }; // Mock data, ajustar se necessário
        await notificationService.sendPaymentConfirmation(orderData.customerId, orderId);
        return true;
      }),
    }),
  },
}));

// Configuração de mocks para notificações
jest.mock('@/services/NotificationService', () => ({
  NotificationService: {
    getInstance: jest.fn().mockReturnValue({
      enviarNotificacao: jest.fn().mockImplementation(dados => {
        if (!dados.destinatario || !dados.destinatario.includes('@')) {
          throw new Error('Destinatário inválido');
        }
        if (!dados.titulo) {
          throw new Error('Título é obrigatório');
        }
        if (!dados.mensagem) {
          throw new Error('Mensagem é obrigatória');
        }
        return {
          id: 'not_123',
          destinatario: dados.destinatario,
          titulo: dados.titulo,
          mensagem: dados.mensagem,
          status: 'enviada',
          data: new Date(),
          lida: false,
        };
      }),
      consultarNotificacao: jest.fn().mockImplementation(id => {
        if (id === 'not_123') {
          return {
            id: 'not_123',
            destinatario: 'teste@email.com',
            titulo: 'Teste',
            mensagem: 'Mensagem de teste',
            status: 'enviada',
            data: new Date(),
            lida: false,
          };
        }
        throw new Error('Notificação não encontrada');
      }),
      marcarComoLida: jest.fn().mockImplementation(idNotificacao => {
        if (idNotificacao === 'not_123') {
          return {
            id: 'not_123',
            destinatario: 'teste@email.com',
            titulo: 'Teste',
            mensagem: 'Mensagem de teste',
            status: 'lida',
            data: new Date(),
            lida: true,
          };
        }
        if (idNotificacao === 'not_lida') {
          throw new Error('Notificação já está lida');
        }
        throw new Error('Notificação não encontrada');
      }),
      listarNotificacoes: jest.fn().mockImplementation(filtros => {
        // Revertendo para retornar array vazio por padrão
        return [];
      }),
      excluirNotificacao: jest.fn().mockImplementation(id => {
        if (id === 'not_123') {
          return true;
        }
        throw new Error('Notificação não encontrada');
      }),
      getUserNotifications: jest.fn().mockImplementation(userId => {
        return [];
      }),
      sendNotification: jest.fn().mockImplementation((userId, type, data) => {
        return true;
      }),
      sendPushNotification: jest.fn().mockImplementation((token, title, body, data) => {
        return true;
      }),
      sendPaymentConfirmation: jest.fn().mockImplementation((userId, paymentData) => {
        return true;
      }),
    }),
  },
}));

// Configuração de mocks para pedidos
jest.mock('@/services/OrderService', () => ({
  OrderService: {
    getInstance: jest.fn().mockReturnValue({
      criarPedido: jest.fn().mockImplementation(async dados => {
        if (!dados.itens || dados.itens.length === 0) {
          return Promise.reject(new Error('Pedido deve conter pelo menos um item'));
        }
        if (!dados.valorTotal || dados.valorTotal <= 0) {
          return Promise.reject(new Error('Valor total do pedido deve ser maior que zero'));
        }
        return Promise.resolve({
          id: 'ped_123',
          data: new Date(),
          itens: dados.itens,
          status: 'pendente',
          valorTotal: dados.valorTotal,
        });
      }),
      consultarPedido: jest.fn().mockImplementation(id => {
        if (id === 'ped_123') {
          return {
            id: 'ped_123',
            data: new Date(),
            itens: [
              {
                produto: 'Bolo de Chocolate',
                quantidade: 1,
                preco: 50,
              },
            ],
            status: 'pendente',
            valorTotal: 50,
          };
        }
        throw new Error('Pedido não encontrado');
      }),
      atualizarStatusPedido: jest.fn().mockImplementation((id, status) => {
        if (id === 'ped_123') {
          if (
            !['pendente', 'aprovado', 'em_preparo', 'pronto', 'entregue', 'cancelado'].includes(
              status
            )
          ) {
            throw new Error('Status inválido');
          }
          return {
            id: 'ped_123',
            data: new Date(),
            itens: [
              {
                produto: 'Bolo de Chocolate',
                quantidade: 1,
                preco: 50,
              },
            ],
            status,
            valorTotal: 50,
          };
        }
        throw new Error('Pedido não encontrado');
      }),
      cancelarPedido: jest.fn().mockImplementation(id => {
        if (id === 'ped_123') {
          return {
            id: 'ped_123',
            data: new Date(),
            itens: [
              {
                produto: 'Bolo de Chocolate',
                quantidade: 1,
                preco: 50,
              },
            ],
            status: 'cancelado',
            valorTotal: 50,
          };
        }
        throw new Error('Pedido não encontrado');
      }),
      listarPedidos: jest.fn().mockImplementation(filtros => {
        // Revertendo para retornar array vazio por padrão
        return [];
      }),
      calcularValorTotal: jest.fn().mockImplementation(itens => {
        if (!itens || itens.length === 0) return 0;
        // Simulação básica: assume que item tem preco e quantidade
        return itens.reduce((total, item) => total + item.preco * item.quantidade, 0);
      }),
    }),
  },
}));

// Configuração de mocks para produtos
jest.mock('@/services/ProductService', () => ({
  ProductService: {
    getInstance: jest.fn().mockReturnValue({
      criarProduto: jest.fn().mockImplementation(dados => {
        if (!dados.nome) {
          throw new Error('Nome é obrigatório');
        }
        if (!dados.preco || dados.preco <= 0) {
          throw new Error('Preço deve ser maior que zero');
        }
        if (!dados.categoria) {
          throw new Error('Categoria é obrigatória');
        }
        return {
          id: 'prod_123',
          nome: dados.nome,
          descricao: dados.descricao,
          preco: dados.preco,
          categoria: dados.categoria,
          disponivel: dados.disponivel !== undefined ? dados.disponivel : true,
          data: new Date(),
          imagem: dados.imagem || 'default.jpg',
        };
      }),
      consultarProduto: jest.fn().mockImplementation(id => {
        if (id === 'prod_123') {
          return {
            id: 'prod_123',
            nome: 'Bolo de Chocolate',
            descricao: 'Descrição do produto mockado',
            preco: 50,
            categoria: 'bolos',
            disponivel: true,
            data: new Date(),
            imagem: 'bolo-chocolate.jpg',
          };
        }
        throw new Error('Produto não encontrado');
      }),
      atualizarProduto: jest.fn().mockImplementation((id, dados) => {
        if (id === 'prod_123') {
          if (dados.preco && dados.preco <= 0) {
            throw new Error('Preço deve ser maior que zero');
          }
          return {
            id: 'prod_123',
            nome: dados.nome || 'Bolo de Chocolate',
            descricao: dados.descricao || 'Descrição do produto mockado',
            preco: dados.preco || 50,
            categoria: dados.categoria || 'bolos',
            disponivel: dados.disponivel !== undefined ? dados.disponivel : true,
            data: new Date(),
            imagem: dados.imagem || 'bolo-chocolate-premium.jpg',
          };
        }
        throw new Error('Produto não encontrado');
      }),
      excluirProduto: jest.fn().mockImplementation(id => {
        if (id === 'prod_123') {
          return true;
        }
        throw new Error('Produto não encontrado');
      }),
      listarProdutos: jest.fn().mockImplementation(filtros => {
        // Revertendo para retornar array vazio por padrão
        return [];
      }),
      atualizarDisponibilidade: jest.fn().mockImplementation((id, disponivel) => {
        if (id === 'prod_123') {
          return {
            id: 'prod_123',
            nome: 'Produto Teste',
            descricao: 'Descrição do produto',
            preco: 100,
            categoria: 'teste',
            disponivel,
            data: new Date(),
          };
        }
        throw new Error('Produto não encontrado');
      }),
      atualizarPreco: jest.fn().mockImplementation((id, preco) => {
        if (id === 'prod_123') {
          if (preco <= 0) {
            throw new Error('Preço deve ser maior que zero');
          }
          return {
            id: 'prod_123',
            nome: 'Produto Teste',
            descricao: 'Descrição do produto',
            preco,
            categoria: 'teste',
            disponivel: true,
            data: new Date(),
          };
        }
        throw new Error('Produto não encontrado');
      }),
    }),
  },
}));

// Mock para StripeService
jest.mock('@/services/StripeService', () => {
  const mockStripeInstance = {
    // ... (definições dos métodos mockados, como createPaymentIntent, etc. - sem alterações aqui)
    createPaymentIntent: jest
      .fn()
      .mockResolvedValue({ clientSecret: 'test_secret', id: 'pi_mock_123' }),
    updatePaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_mock_123', status: 'succeeded' }),
    cancelPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_mock_123', status: 'canceled' }),
    retrievePaymentIntent: jest
      .fn()
      .mockResolvedValue({ id: 'pi_mock_123', status: 'succeeded', amount: 1000 }),
    createPaymentMethod: jest
      .fn()
      .mockResolvedValue({
        id: 'pm_mock_123',
        type: 'card',
        card: { brand: 'visa', last4: '4242' },
      }),
    attachPaymentMethod: jest.fn().mockResolvedValue({ id: 'pm_mock_123' }),
    attachPaymentMethodToCustomer: jest
      .fn()
      .mockResolvedValue({ id: 'pm_mock_123', customer: 'cus_mock_123' }),
    listPaymentMethods: jest.fn().mockResolvedValue({
      data: [
        { id: 'pm_1', type: 'card' },
        { id: 'pm_2', type: 'card' },
      ],
    }),
    detachPaymentMethod: jest.fn().mockResolvedValue({ id: 'pm_mock_123', deleted: true }),
    createRefund: jest.fn().mockResolvedValue({ id: 're_mock_123', status: 'succeeded' }),
    processRefund: jest
      .fn()
      .mockResolvedValue({
        id: 're_123456789',
        payment_intent: 'pi_123456789',
        amount: 7500,
        status: 'succeeded',
      }), // Usando o valor atualizado do mock SDK
    createCustomer: jest.fn().mockResolvedValue({ id: 'cus_mock_123' }),
    getCustomer: jest.fn().mockResolvedValue({ id: 'cus_mock_123', email: 'mock@example.com' }),
    createSetupIntent: jest
      .fn()
      .mockResolvedValue({ clientSecret: 'setup_secret', id: 'seti_mock_123' }),
    handleWebhook: jest.fn().mockImplementation((eventBody, signature) => {
      try {
        const event = JSON.parse(eventBody);
        // ... (lógica do webhook - sem alterações aqui)
        if (event.type === 'payment_intent.succeeded') {
          return {
            received: true,
            eventData: {
              id: 'pi_mock_123',
              amount: 1000,
              customer: 'cus_mock_123',
              metadata: { orderId: 'order_mock_123' },
              charges: { data: [{ receipt_url: 'mock_receipt_url' }] },
            },
          };
        }
        if (event.type === 'payment_intent.payment_failed') {
          return {
            received: true,
            eventData: {
              id: 'pi_mock_fail',
              metadata: { orderId: 'order_mock_fail' },
              last_payment_error: { message: 'mock failure' },
            },
          };
        }
        if (event.type === 'charge.dispute.created') {
          return {
            received: true,
            eventData: {
              id: 'dp_mock_123',
              charge: 'ch_mock_123',
              status: 'needs_response',
              reason: 'fraudulent',
              amount: 15000,
            },
          };
        }
        return { received: true, eventData: { id: 'evt_mock_generic', type: event.type } };
      } catch (e) {
        console.error('Mock handleWebhook error parsing eventBody:', e);
        throw new Error('Mock webhook processing error');
      }
    }),
    generatePixQrCode: jest
      .fn()
      .mockResolvedValue({ qrCode: 'pix_qr_code', expiresAt: 1234567890 }),
    initialize: jest.fn().mockResolvedValue(undefined),
  };

  // Criar um objeto que simula a classe StripeService
  const StripeServiceClassMock = jest.fn(() => mockStripeInstance);
  // Adicionar o método estático getInstance à classe mockada
  StripeServiceClassMock.getInstance = jest.fn(() => mockStripeInstance);

  // Retornar o mock de forma que funcione com import nomeado e default
  return {
    __esModule: true, // Indica que é um módulo ES
    StripeService: StripeServiceClassMock,
    default: StripeServiceClassMock, // Exportação default
  };
});

// Mock para Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn().mockReturnValue({}), // Simula a inicialização
  getApps: jest.fn(() => [{}]), // Simula que um app já foi inicializado
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    // Retorna um objeto mock de autenticação
    // Adicione mocks para funções de auth usadas, se necessário
    // ex: signInWithEmailAndPassword: jest.fn()
  })),
  // Adicione mocks para outras exportações de auth, se necessário
}));

jest.mock('firebase/firestore', () => {
  // Funções mockadas para simular a estrutura de dados do Firestore
  const mockDocData = (data = {}) => ({ id: 'mock-doc-id', data: () => data, exists: () => true });
  const mockQuerySnapshot = (docsData = []) => ({
    empty: docsData.length === 0,
    docs: docsData.map(mockDocData),
    forEach: callback => docsData.map(mockDocData).forEach(callback),
  });

  return {
    getFirestore: jest.fn(() => ({})), // Mock simples para getFirestore
    doc: jest.fn((db, path, id) => ({
      // Mock para doc
      id: id || 'mock-doc-id',
      path: path,
      // Adicionar métodos se necessário, como onSnapshot
    })),
    getDoc: jest.fn().mockResolvedValue(
      mockDocData({
        /* dados mock genéricos */
      })
    ),
    updateDoc: jest.fn().mockResolvedValue(undefined),
    setDoc: jest.fn().mockResolvedValue(undefined),
    deleteDoc: jest.fn().mockResolvedValue(undefined),
    addDoc: jest.fn().mockResolvedValue({ id: 'mock-added-doc-id' }), // Mock para addDoc
    collection: jest.fn((db, path) => ({
      // Mock para collection
      path: path,
      doc: jest.fn(id => ({ id: id || 'mock-doc-id', path: `${path}/${id || 'mock-doc-id'}` })),
      add: jest.fn().mockResolvedValue({ id: 'mock-added-doc-id' }),
      where: jest.fn(() => ({
        // Mock para where
        get: jest.fn().mockResolvedValue(mockQuerySnapshot([])), // Retorna snapshot vazio por padrão
        // Adicionar outros operadores de query se necessário (orderBy, limit, etc)
      })),
      get: jest.fn().mockResolvedValue(mockQuerySnapshot([])), // get direto na collection retorna snapshot vazio
      // Adicionar onSnapshot se necessário
    })),
    query: jest.fn((collectionRef, ...queryConstraints) => ({
      // Mock para query
      // Simular a aplicação de constraints seria complexo, retornar snapshot vazio por padrão
      get: jest.fn().mockResolvedValue(mockQuerySnapshot([])),
    })),
    where: jest.fn((fieldPath, opStr, value) => ({ type: 'where', fieldPath, opStr, value })), // Mock constraint
    orderBy: jest.fn((fieldPath, directionStr) => ({ type: 'orderBy', fieldPath, directionStr })), // Mock constraint
    limit: jest.fn(num => ({ type: 'limit', num })), // Mock constraint
    // Adicionar Timestamp, FieldValue, etc., se necessário
    Timestamp: {
      now: jest.fn(() => ({ toDate: () => new Date() })),
      fromDate: jest.fn(date => ({ toDate: () => date })),
    },
    FieldValue: {
      serverTimestamp: jest.fn(() => 'mock-server-timestamp'), // Placeholder
      delete: jest.fn(() => 'mock-delete-field'), // Placeholder
    },
  };
});

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({
    // Retorna um objeto mock do Storage
    // Adicione mocks para funções do Storage usadas, se necessário
    // ex: ref: jest.fn(), uploadBytes: jest.fn()
  })),
  // Adicione mocks para outras exportações do storage, se necessário
}));

jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({
    // Retorna um objeto mock do Messaging
    // Mock de funções para evitar erros "unsupported-browser"
    getToken: jest.fn().mockResolvedValue('mock-token'),
    onMessage: jest.fn(),
    // Adicione outros mocks se necessário
  })),
  isSupported: jest.fn(() => Promise.resolve(true)), // Simula que é suportado
}));

// Mock para AsyncStorage (adicionado acima)
// ...

// Refatora CacheService para usar o mock do AsyncStorage
jest.mock('@/services/CacheService', () => {
  // Importa o AsyncStorage mockado
  const AsyncStorage = require('@react-native-async-storage/async-storage');

  return {
    CacheService: {
      getInstance: jest.fn().mockReturnValue({
        // Delega chamadas para o AsyncStorage mockado
        setItem: jest.fn().mockImplementation(async (key, value, options) => {
          // Simulamos a stringificação que o serviço real faria
          const stringValue = JSON.stringify(value);
          // Chama o AsyncStorage mockado, passando 3 argumentos
          // O terceiro argumento (options) é passado adiante
          return AsyncStorage.setItem(key, stringValue, options || {});
        }),
        getItem: jest.fn().mockImplementation(async key => {
          // Chama o AsyncStorage mockado
          const stringValue = await AsyncStorage.getItem(key);
          // Simulamos a desserialização
          return stringValue ? JSON.parse(stringValue) : null;
        }),
        removeItem: jest.fn().mockImplementation(async key => {
          return AsyncStorage.removeItem(key);
        }),
        clear: jest.fn().mockImplementation(async () => {
          return AsyncStorage.clear();
        }),
        multiGet: jest.fn().mockImplementation(async keys => {
          // Chama o AsyncStorage mockado
          const results = await AsyncStorage.multiGet(keys);
          // Ajusta o retorno para ser um array apenas com os valores (ou null)
          // correspondendo à ordem das chaves solicitadas.
          const valueMap = new Map(results);
          return keys.map(key => {
            const stringValue = valueMap.get(key);
            return stringValue ? JSON.parse(stringValue) : null;
          });
        }),
        // Adicionar outros métodos se CacheService tiver mais...
      }),
    },
  };
});

// Mock para SecurityService
jest.mock('@/services/securityService', () => {
  // Importar mocks necessários para chamadas internas
  const CacheService = require('@/services/CacheService').CacheService;
  const PerformanceService = require('@/services/PerformanceService').PerformanceService;

  const mockInstance = {
    // Retorna string vazia para entrada nula/indefinida
    encryptData: jest.fn().mockImplementation(async data => (data ? `encrypted:${data}` : '')),
    decryptData: jest.fn().mockImplementation(async data => {
      if (typeof data === 'string' && data.startsWith('encrypted:')) {
        return data.substring(10);
      }
      return null;
    }),
    secureStore: jest.fn().mockImplementation(async (key, data) => {
      const performanceServiceInstance = PerformanceService.getInstance();
      const cacheServiceInstance = CacheService.getInstance();
      const operation = async () => {
        if (key.includes('fail')) {
          console.error(`Mock secureStore: Simulating failure for key ${key}`);
          return false; // Simula falha para testes de erro
        }
        const encryptedData = await mockInstance.encryptData(data); // Usa o próprio mock para encriptar
        await cacheServiceInstance.setItem(`secure_${key}`, encryptedData, { secure: true }); // Chama mock CacheService
        console.log(`Mock secureStore: Stored data for key ${key}`);
        return true; // Sucesso
      };
      return performanceServiceInstance.trackOperation('security_store', operation);
    }),
    secureRetrieve: jest.fn().mockImplementation(async key => {
      const performanceServiceInstance = PerformanceService.getInstance();
      const cacheServiceInstance = CacheService.getInstance();
      const operation = async () => {
        if (key.includes('fail')) {
          console.error(`Mock secureRetrieve: Simulating failure for key ${key}`);
          return null; // Simula falha para testes de erro
        }
        const encryptedData = await cacheServiceInstance.getItem(`secure_${key}`); // Chama mock CacheService
        console.log(`Mock secureRetrieve: Retrieved data for key ${key}`);
        return mockInstance.decryptData(encryptedData); // Usa o próprio mock para decriptar
      };
      return performanceServiceInstance.trackOperation('security_retrieve', operation);
    }),
    // Mantém os aliases internos (podem ser removidos se não usados diretamente)
    storeSecureData: jest.fn().mockResolvedValue(undefined),
    retrieveSecureData: jest
      .fn()
      .mockImplementation(async key => `encrypted:mock-value-for-${key}`),
    generateKey: jest.fn().mockResolvedValue('mock-key'),
    hashData: jest.fn().mockImplementation(async data => (data ? `hashed:${data}` : null)),
    compareHash: jest.fn().mockImplementation(async (data, hash) => hash === `hashed:${data}`),
  };
  return {
    SecurityService: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

// Mock para a biblioteca Stripe SDK
jest.mock('stripe', () => {
  // Retorna um construtor mockado que pode ser instanciado com 'new Stripe(...)'
  const mockStripeInstance = {
    paymentIntents: {
      // Valores alinhados com StripeServiceIntegration.test.ts
      create: jest
        .fn()
        .mockResolvedValue({
          id: 'pi_123456789',
          client_secret: 'secret_123',
          status: 'requires_payment_method',
          amount: 15000,
          currency: 'brl',
        }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_123456789', status: 'succeeded' }), // Manter simples ou ajustar se necessário
      update: jest
        .fn()
        .mockResolvedValue({
          id: 'pi_123456789',
          client_secret: 'secret_123',
          status: 'requires_payment_method',
          amount: 20000,
          currency: 'brl',
        }),
      confirm: jest.fn().mockResolvedValue({ id: 'pi_123456789', status: 'succeeded' }), // Manter simples ou ajustar se necessário
      cancel: jest
        .fn()
        .mockResolvedValue({
          id: 'pi_123456789',
          status: 'canceled',
          cancellation_reason: 'requested_by_customer',
        }),
    },
    paymentMethods: {
      // Valores alinhados com StripeServiceIntegration.test.ts
      create: jest
        .fn()
        .mockResolvedValue({
          id: 'pm_123456789',
          type: 'card',
          card: { brand: 'visa', last4: '1111', expMonth: 12, expYear: 2025 },
        }),
      attach: jest.fn().mockResolvedValue({ id: 'pm_123456789', customer: 'cus_123456789' }),
      detach: jest.fn().mockResolvedValue({ id: 'pm_123456789' }), // Ajustado para corresponder ao teste
      list: jest.fn().mockResolvedValue({ data: [{ id: 'pm_sdk_mock', type: 'card' }] }), // Manter simples ou ajustar
    },
    setupIntents: {
      create: jest
        .fn()
        .mockResolvedValue({
          id: 'seti_sdk_mock',
          client_secret: 'seti_sdk_secret',
          status: 'requires_payment_method',
        }),
      confirm: jest.fn().mockResolvedValue({ id: 'seti_sdk_mock', status: 'succeeded' }),
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_sdk_mock', email: 'customer@example.com' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_sdk_mock' }),
      update: jest.fn().mockResolvedValue({ id: 'cus_sdk_mock' }),
      listPaymentMethods: jest.fn().mockResolvedValue({ data: [{ id: 'pm_sdk_mock' }] }),
    },
    refunds: {
      // Valor alinhado com StripeServiceIntegration.test.ts
      create: jest
        .fn()
        .mockResolvedValue({
          id: 're_123456789',
          payment_intent: 'pi_123456789',
          amount: 7500,
          status: 'succeeded',
        }),
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation((payload, sig, secret) => {
        try {
          return JSON.parse(payload);
        } catch (e) {
          return { id: 'evt_webhook_mock', type: 'mock.event' };
        }
      }),
    },
    charges: {
      // Adicionado mock para charges, usado em PaymentStripeIntegration
      retrieve: jest.fn().mockResolvedValue({ id: 'ch_mock_123', payment_intent: 'pi_123456789' }),
    },
    // Adicionar outros namespaces/métodos do SDK se necessário
  };

  return jest.fn().mockImplementation(() => mockStripeInstance);
});
