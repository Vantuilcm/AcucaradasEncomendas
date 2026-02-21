import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../../App';
import { AuthProvider } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { act } from 'react-test-renderer';

// Mock das dependências externas
jest.mock('expo-notifications');
jest.mock('../../config/onesignal');
jest.mock('../../services/NotificationService');

// Mock do Firebase Auth e Firestore
const mockSignIn = jest.fn().mockResolvedValue({ user: { uid: 'test-user-id' } });
const mockGetProducts = jest.fn().mockResolvedValue([
  {
    id: 'prod1',
    nome: 'Bolo de Chocolate',
    preco: 45.9,
    descricao: 'Delicioso bolo de chocolate',
    imagem: 'url-imagem',
    disponivel: true,
  },
  {
    id: 'prod2',
    nome: 'Cupcake de Morango',
    preco: 8.5,
    descricao: 'Cupcake com cobertura de morango',
    imagem: 'url-imagem',
    disponivel: true,
  },
]);
const mockAddToCart = jest.fn().mockResolvedValue(true);
const mockGetCart = jest
  .fn()
  .mockResolvedValue([
    { id: 'prod1', nome: 'Bolo de Chocolate', preco: 45.9, quantidade: 1, subtotal: 45.9 },
  ]);
const mockProcessPayment = jest.fn().mockResolvedValue({ success: true, orderId: 'order123' });

// Configurar mocks
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  signInWithEmailAndPassword: () => mockSignIn(),
}));

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDocs: () => ({ docs: mockGetProducts().map(p => ({ id: p.id, data: () => p })) }),
  addDoc: () => mockAddToCart(),
  getDoc: () => ({ exists: () => true, data: () => mockGetCart()[0] }),
}));

// Mock do Stripe
jest.mock('@stripe/stripe-react-native', () => ({
  ...jest.requireActual('@stripe/stripe-react-native'),
  useStripe: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  }),
}));

describe('Teste E2E - Fluxo Completo de Compra', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
      addListener: jest.fn(),
    });
  });

  it('deve completar o fluxo de compra do login até a confirmação do pedido', async () => {
    const { getByTestId, getByText, queryByText, getAllByTestId } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // 1. Verificar se a tela de login está visível
    await waitFor(() => {
      expect(getByTestId('login-screen')).toBeTruthy();
    });

    // 2. Realizar login
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'cliente@exemplo.com');
    fireEvent.changeText(passwordInput, 'senha123');

    await act(async () => {
      fireEvent.press(loginButton);
    });

    // 3. Verificar navegação para a tela inicial após login
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });

    // 4. Navegar para a tela de produtos
    const produtosButton = getByTestId('produtos-button');

    await act(async () => {
      fireEvent.press(produtosButton);
    });

    // 5. Verificar se a tela de produtos carregou
    await waitFor(() => {
      expect(getByTestId('produtos-screen')).toBeTruthy();
      expect(getByText('Bolo de Chocolate')).toBeTruthy();
    });

    // 6. Selecionar um produto
    const produto = getByTestId('produto-prod1');

    await act(async () => {
      fireEvent.press(produto);
    });

    // 7. Verificar se a tela de detalhes do produto carregou
    await waitFor(() => {
      expect(getByTestId('produto-detalhe-screen')).toBeTruthy();
      expect(getByText('Bolo de Chocolate')).toBeTruthy();
      expect(getByText('R$ 45,90')).toBeTruthy();
    });

    // 8. Adicionar produto ao carrinho
    const addButton = getByTestId('adicionar-carrinho-button');

    await act(async () => {
      fireEvent.press(addButton);
    });

    // 9. Verificar se o produto foi adicionado ao carrinho
    await waitFor(() => {
      expect(getByText('Produto adicionado ao carrinho!')).toBeTruthy();
    });

    // 10. Navegar para o carrinho
    const carrinhoButton = getByTestId('carrinho-button');

    await act(async () => {
      fireEvent.press(carrinhoButton);
    });

    // 11. Verificar se a tela do carrinho carregou corretamente
    await waitFor(() => {
      expect(getByTestId('carrinho-screen')).toBeTruthy();
      expect(getByText('Bolo de Chocolate')).toBeTruthy();
      expect(getByText('R$ 45,90')).toBeTruthy();
    });

    // 12. Prosseguir para o checkout
    const checkoutButton = getByTestId('finalizar-compra-button');

    await act(async () => {
      fireEvent.press(checkoutButton);
    });

    // 13. Verificar se a tela de checkout carregou
    await waitFor(() => {
      expect(getByTestId('checkout-screen')).toBeTruthy();
    });

    // 14. Preencher informações de entrega
    const enderecoInput = getByTestId('endereco-input');
    const numeroInput = getByTestId('numero-input');
    const complementoInput = getByTestId('complemento-input');
    const bairroInput = getByTestId('bairro-input');
    const cidadeInput = getByTestId('cidade-input');
    const estadoInput = getByTestId('estado-input');
    const cepInput = getByTestId('cep-input');

    fireEvent.changeText(enderecoInput, 'Rua das Flores');
    fireEvent.changeText(numeroInput, '123');
    fireEvent.changeText(complementoInput, 'Apto 101');
    fireEvent.changeText(bairroInput, 'Centro');
    fireEvent.changeText(cidadeInput, 'São Paulo');
    fireEvent.changeText(estadoInput, 'SP');
    fireEvent.changeText(cepInput, '01001-000');

    // 15. Continuar para pagamento
    const continuarButton = getByTestId('continuar-pagamento-button');

    await act(async () => {
      fireEvent.press(continuarButton);
    });

    // 16. Verificar se a tela de pagamento carregou
    await waitFor(() => {
      expect(getByTestId('pagamento-screen')).toBeTruthy();
    });

    // 17. Selecionar método de pagamento
    const cartaoCreditoOption = getByTestId('cartao-credito-option');

    await act(async () => {
      fireEvent.press(cartaoCreditoOption);
    });

    // 18. Finalizar pagamento
    const pagarButton = getByTestId('finalizar-pagamento-button');

    await act(async () => {
      fireEvent.press(pagarButton);
    });

    // 19. Verificar se o pagamento foi processado e o pedido confirmado
    await waitFor(() => {
      expect(getByTestId('confirmacao-pedido-screen')).toBeTruthy();
      expect(getByText('Pedido Confirmado!')).toBeTruthy();
      expect(getByText('Seu pedido foi realizado com sucesso.')).toBeTruthy();
      expect(getByText('Número do pedido: order123')).toBeTruthy();
    });

    // 20. Verificar botão para voltar à tela inicial
    const voltarInicioButton = getByTestId('voltar-inicio-button');
    expect(voltarInicioButton).toBeTruthy();

    // 21. Voltar para a tela inicial
    await act(async () => {
      fireEvent.press(voltarInicioButton);
    });

    // 22. Verificar se voltou para a tela inicial
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });
});
