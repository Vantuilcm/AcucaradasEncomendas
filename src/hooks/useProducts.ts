import { useState, useEffect, useCallback } from 'react';
import { ProductService } from '../services/ProductService';
import type { Product, ProductFilter, ProductStats } from '../types/Product';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Instantiate ProductService directly (no singleton implemented)
  const productService = new ProductService();

  // Carregar lista de produtos
  const loadProducts = useCallback(async (filters?: ProductFilter) => {
    try {
      setLoading(true);
      setError(null);
      const productList = await productService.listarProdutos(filters);
      setProducts(productList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar categorias
  const loadCategories = useCallback(async () => {
    try {
      const categoriesList = await productService.listarCategorias();
      setCategories(categoriesList);
    } catch (err) {
      logger.error('Erro ao carregar categorias:', err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  // Atualizar disponibilidade de um produto
  const toggleProductAvailability = useCallback(async (productId: string, isAvailable: boolean) => {
    try {
      setLoading(true);
      setError(null);
      await productService.atualizarDisponibilidade(productId, isAvailable);

      // Atualizar a lista de produtos
      setProducts(prevProducts =>
        prevProducts.map(p => (p.id === productId ? { ...p, disponivel: isAvailable } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar disponibilidade');
    } finally {
      setLoading(false);
    }
  }, []);

  // Excluir um produto
  const deleteProduct = useCallback(async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      await productService.excluirProduto(productId);

      // Remover o produto da lista
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir produto');
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar o preço de um produto
  const updateProductPrice = useCallback(async (productId: string, newPrice: number) => {
    try {
      setLoading(true);
      setError(null);
      const updatedProduct = await productService.atualizarPreco(productId, newPrice);

      // Atualizar a lista de produtos
      setProducts(prevProducts => prevProducts.map(p => (p.id === productId ? updatedProduct : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar preço');
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar um novo produto
  const createProduct = useCallback(async (productData: Partial<Product>) => {
    try {
      setLoading(true);
      setError(null);
      const newProduct = await productService.criarProduto(productData);

      // Adicionar o novo produto à lista
      setProducts(prevProducts => [...prevProducts, newProduct]);

      return newProduct;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar produto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar um produto existente
  const updateProduct = useCallback(async (productId: string, productData: Partial<Product>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedProduct = await productService.atualizarProduto(productId, productData);

      // Atualizar a lista de produtos
      setProducts(prevProducts => prevProducts.map(p => (p.id === productId ? updatedProduct : p)));

      return updatedProduct;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obter estatísticas de um produto
  const getProductStats = useCallback(async (productId: string): Promise<ProductStats> => {
    try {
      return await productService.obterEstatisticasProduto(productId);
    } catch (err) {
      logger.error('Erro ao obter estatísticas do produto:', err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  // Atualizar estoque de um produto
  const updateProductStock = useCallback(async (productId: string, quantity: number) => {
    try {
      setLoading(true);
      setError(null);
      const updatedProduct = await productService.atualizarEstoque(productId, quantity);

      // Atualizar a lista de produtos
      setProducts(prevProducts => prevProducts.map(p => (p.id === productId ? updatedProduct : p)));

      return updatedProduct;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar estoque');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar produtos
  const filterProducts = useCallback(async (filters: ProductFilter) => {
    try {
      setRefreshing(true);
      setError(null);
      const filteredProducts = await productService.listarProdutos(filters);
      setProducts(filteredProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao filtrar produtos');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Buscar produtos
  const searchProducts = useCallback(async (searchTerm: string) => {
    try {
      setRefreshing(true);
      setError(null);
      const filteredProducts = await productService.listarProdutos({ busca: searchTerm });
      setProducts(filteredProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar produtos');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Buscar produtos destacados
  const getFeaturedProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const featuredProducts = await productService.listarProdutosDestacados();
      setProducts(featuredProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos em destaque');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    products,
    loading,
    refreshing,
    error,
    categories,
    loadProducts,
    loadCategories,
    toggleProductAvailability,
    deleteProduct,
    updateProductPrice,
    createProduct,
    updateProduct,
    getProductStats,
    updateProductStock,
    filterProducts,
    searchProducts,
    getFeaturedProducts,
  };
};

