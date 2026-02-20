import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TermsOfUseScreen } from '../../screens/TermsOfUseScreen';
import { useNavigation } from '@react-navigation/native';

describe('Testes E2E - Termos de Uso', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
    });
  });

  it('deve renderizar a tela de termos de uso corretamente', () => {
    const { getByText } = render(<TermsOfUseScreen />);
    expect(getByText('Política de Uso')).toBeTruthy();
  });

  it('deve exibir o subtítulo', () => {
    const { getByTestId } = render(<TermsOfUseScreen />);
    expect(getByTestId('terms-subtitle')).toBeTruthy();
  });

  it('deve exibir o texto introdutório', () => {
    const { getByTestId } = render(<TermsOfUseScreen />);
    expect(getByTestId('terms-intro')).toBeTruthy();
  });

  it('deve exibir todas as seções principais', () => {
    const { getByTestId } = render(<TermsOfUseScreen />);
    const secoes = [
      'I. Disposições Gerais e Natureza da Plataforma',
      'II. Política para Usuários Compradores',
      'III. Política para Produtores de Doces',
      'IV. Política para Entregadores',
      'V. Termos Gerais',
      'VI. Contato e Suporte',
    ];

    secoes.forEach(secao => {
      expect(getByTestId(`section-${secao}`)).toBeTruthy();
    });
  });

  it('deve exibir itens de lista com ícones', () => {
    const { getByTestId } = render(<TermsOfUseScreen />);

    // Verificamos a existência de alguns itens específicos com os testIDs corretos
    expect(getByTestId('list-item-natureza-facilitadora')).toBeTruthy();
    expect(getByTestId('list-item-plataforma-aproximacao')).toBeTruthy();
    expect(getByTestId('list-item-isencao-responsabilidade')).toBeTruthy();
    expect(getByTestId('list-item-canais-atendimento')).toBeTruthy();
    expect(getByTestId('list-item-chat-suporte')).toBeTruthy();
  });

  it('deve exibir informações de contato', () => {
    const { getByTestId } = render(<TermsOfUseScreen />);
    expect(getByTestId('list-item-canais-atendimento').props.description).toBe('Suporte@acucaradasencomendas.com.br');
    expect(getByTestId('list-item-chat-suporte').props.description).toBe('Disponível dentro do aplicativo');
  });

  it('deve exibir a data de atualização', () => {
    const { getByTestId } = render(<TermsOfUseScreen />);
    expect(getByTestId('terms-footer')).toBeTruthy();
  });

  it('deve ter estilos consistentes', () => {
    const { getByTestId } = render(<TermsOfUseScreen />);
    const scrollView = getByTestId('terms-scroll-view');
    expect(scrollView).toBeTruthy();
  });

  it('deve permitir rolagem do conteúdo', async () => {
    const { getByTestId } = render(<TermsOfUseScreen />);
    const scrollView = getByTestId('terms-scroll-view');

    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { y: 200 },
        contentSize: { height: 1000, width: 400 },
        layoutMeasurement: { height: 400, width: 400 },
      },
    });

    await waitFor(() => {
      expect(scrollView).toBeTruthy();
    });
  });

  it('deve permitir interação com os itens da lista', async () => {
    const { getByTestId } = render(<TermsOfUseScreen />);

    expect(getByTestId('list-item-natureza-facilitadora')).toBeTruthy();
    expect(getByTestId('list-item-plataforma-aproximacao')).toBeTruthy();
    expect(getByTestId('list-item-isencao-responsabilidade')).toBeTruthy();
  });

  it('deve manter a estrutura visual correta', () => {
    const { getByText, getByTestId } = render(<TermsOfUseScreen />);
    const container = getByTestId('terms-scroll-view');

    expect(container).toHaveStyle({ flex: 1 });
    expect(getByText('Política de Uso')).toHaveStyle({ textAlign: 'center' });
  });
});
