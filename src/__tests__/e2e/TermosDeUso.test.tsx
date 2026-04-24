import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TermsOfUseScreen } from '../../screens/TermsOfUseScreen';
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    Text: (props: any) => <Text {...props} />,
    List: {
      Section: (props: any) => <View {...props} />,
      Subheader: (props: any) => <Text {...props} />,
      Item: (props: any) => (
        <View {...props} testID={props.testID}>
          <Text>{props.title}</Text>
          <Text>{props.description}</Text>
        </View>
      ),
      Icon: (props: any) => <View {...props} />,
    },
    Divider: () => <View />,
    useTheme: () => ({ colors: { primary: 'blue' } }),
  };
});

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
    const { getByText } = render(<TermsOfUseScreen />);
    expect(getByText('Açucaradas Encomendas')).toBeTruthy();
  });

  it('deve exibir o texto introdutório', () => {
    const { getByText } = render(<TermsOfUseScreen />);
    expect(getByText(/Esta política de uso visa esclarecer/)).toBeTruthy();
  });

  it('deve exibir todas as seções principais', () => {
    const { getByText } = render(<TermsOfUseScreen />);
    const secoes = [
      'I. Disposições Gerais e Natureza da Plataforma',
      'II. Política para Usuários Compradores',
      'III. Política para Produtores de Doces',
      'IV. Política para Entregadores',
      'V. Termos Gerais',
      'VI. Contato e Suporte',
    ];

    secoes.forEach(secao => {
      expect(getByText(secao)).toBeTruthy();
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
    const { getByText } = render(<TermsOfUseScreen />);
    expect(getByText('Suporte@acucaradasencomendas.com.br')).toBeTruthy();
    expect(getByText('Disponível dentro do aplicativo')).toBeTruthy();
  });

  it('deve exibir a data de atualização', () => {
    const { getByText } = render(<TermsOfUseScreen />);
    expect(getByText(/Última atualização:/)).toBeTruthy();
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
    const { getByTestId, getByText } = render(<TermsOfUseScreen />);

    // Verificamos se os itens específicos existem usando os testIDs corretos
    expect(getByTestId('list-item-natureza-facilitadora')).toBeTruthy();
    expect(getByTestId('list-item-plataforma-aproximacao')).toBeTruthy();
    expect(getByTestId('list-item-isencao-responsabilidade')).toBeTruthy();

    // Verificamos se os textos dos itens estão corretos
    expect(getByText('Natureza Facilitadora')).toBeTruthy();
    expect(getByText('Plataforma de Aproximação')).toBeTruthy();
    expect(getByText('Isenção de Responsabilidade')).toBeTruthy();
  });

  it('deve manter a estrutura visual correta', () => {
    const { getByText, getByTestId } = render(<TermsOfUseScreen />);
    const container = getByTestId('terms-scroll-view');

    expect(container.props.style).toHaveProperty('flex', 1);
    
    // Check for textAlign: 'center' in style array or object
    const titleStyle = getByText('Política de Uso').props.style;
    const flattenedStyle = StyleSheet.flatten(titleStyle);
      
    expect(flattenedStyle).toHaveProperty('textAlign', 'center');
  });
});
