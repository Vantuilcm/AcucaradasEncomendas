/**
 * Testes para o componente ProductGrid
 *
 * Este arquivo contém testes unitários para o componente ProductGrid,
 * com foco especial no tratamento de valores undefined e null para prevenir erros.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProductGrid from '../src/components/ProductGrid';

// Mock para o componente de imagem e outros componentes necessários
jest.mock('react-native/Libraries/Image/Image', () => ({
  __esModule: true,
  default: 'Image',
}));

// Mock para o serviço de carrinho
jest.mock('../src/services/CartService', () => ({
  adicionarAoCarrinho: jest.fn(),
}));

describe('ProductGrid Component', () => {
  const mockProducts = [
    {
      id: '1',
      nome: 'Bolo de Chocolate',
      preco: 50.0,
      descricao: 'Delicioso bolo de chocolate',
      categoria: 'Bolos',
      imagens: ['https://example.com/bolo1.jpg'],
      destaque: true,
      tags: ['chocolate', 'festa'],
    },
    {
      id: '2',
      nome: 'Cupcake de Baunilha',
      preco: 8.0,
      descricao: 'Cupcake de baunilha com cobertura',
      categoria: 'Cupcakes',
      imagens: ['https://example.com/cupcake1.jpg'],
      destaque: false,
      tags: ['baunilha'],
    },
  ];

  const mockOnFilterChange = jest.fn();

  test('renderiza corretamente com produtos válidos', () => {
    const { getByText } = render(
      <ProductGrid
        products={mockProducts}
        isLoading={false}
        error={null}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(getByText('Bolo de Chocolate')).toBeTruthy();
    expect(getByText('Cupcake de Baunilha')).toBeTruthy();
  });

  test('lida corretamente com produtos sem imagens', () => {
    const productsWithoutImages = [
      {
        id: '3',
        nome: 'Produto sem imagem',
        preco: 25.0,
        descricao: 'Produto sem imagem para teste',
        categoria: 'Teste',
        imagens: undefined,
        destaque: false,
        tags: ['teste'],
      },
    ];

    const { getByText } = render(
      <ProductGrid
        products={productsWithoutImages}
        isLoading={false}
        error={null}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(getByText('Produto sem imagem')).toBeTruthy();
  });

  test('lida corretamente com produtos com array de imagens vazio', () => {
    const productsWithEmptyImages = [
      {
        id: '4',
        nome: 'Produto com array vazio',
        preco: 30.0,
        descricao: 'Produto com array de imagens vazio',
        categoria: 'Teste',
        imagens: [],
        destaque: false,
        tags: ['teste'],
      },
    ];

    const { getByText } = render(
      <ProductGrid
        products={productsWithEmptyImages}
        isLoading={false}
        error={null}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(getByText('Produto com array vazio')).toBeTruthy();
  });

  test('lida corretamente com produtos com campos null', () => {
    const productsWithNullFields = [
      {
        id: '5',
        nome: 'Produto com campos null',
        preco: 15.0,
        descricao: null,
        categoria: null,
        imagens: null,
        destaque: false,
        tags: null,
      },
    ];

    const { getByText } = render(
      <ProductGrid
        products={productsWithNullFields}
        isLoading={false}
        error={null}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(getByText('Produto com campos null')).toBeTruthy();
  });

  test('filtra produtos corretamente por categoria', async () => {
    const { getByText, queryByText } = render(
      <ProductGrid
        products={mockProducts}
        isLoading={false}
        error={null}
        onFilterChange={mockOnFilterChange}
      />
    );

    // Selecionar a categoria 'Bolos'
    fireEvent.press(getByText('Bolos'));

    await waitFor(() => {
      expect(getByText('Bolo de Chocolate')).toBeTruthy();
      expect(queryByText('Cupcake de Baunilha')).toBeNull();
    });
  });

  test('filtra produtos corretamente por termo de busca', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ProductGrid
        products={mockProducts}
        isLoading={false}
        error={null}
        onFilterChange={mockOnFilterChange}
        showSearchBar={true}
      />
    );

    // Digitar no campo de busca
    const searchInput = getByPlaceholderText('Buscar produtos...');
    fireEvent.changeText(searchInput, 'chocolate');

    await waitFor(() => {
      expect(getByText('Bolo de Chocolate')).toBeTruthy();
      expect(queryByText('Cupcake de Baunilha')).toBeNull();
    });
  });

  test('exibe mensagem quando não há produtos', () => {
    const { getByText } = render(
      <ProductGrid
        products={[]}
        isLoading={false}
        error={null}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(getByText('Nenhum produto encontrado')).toBeTruthy();
  });

  test('exibe indicador de carregamento', () => {
    const { getByTestId } = render(
      <ProductGrid
        products={[]}
        isLoading={true}
        error={null}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('exibe mensagem de erro quando ocorre um erro', () => {
    const { getByText } = render(
      <ProductGrid
        products={[]}
        isLoading={false}
        error={'Erro ao carregar produtos'}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(getByText('Erro ao carregar produtos')).toBeTruthy();
  });
});
