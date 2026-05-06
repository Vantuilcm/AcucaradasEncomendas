import { dbFunctions } from '../config/firebase';
const f = dbFunctions;
import { Product, ProductFilter, ProductStats } from '../types/Product';
import { loggingService } from './LoggingService';

export class ProductService {
  private static instance: ProductService;
  private readonly collectionName = 'products';

  private constructor() {
    // Inicialização do serviço
    loggingService.info('ProductService inicializado');
  }

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  /**
   * Cria um novo produto no Firestore
   * @param dados Dados do produto a ser criado
   * @returns Produto criado
   */
  public async criarProduto(dados: Partial<Product>): Promise<Product> {
    try {
      // Validações
      if (!dados.nome) {
        throw new Error('Nome é obrigatório');
      }
      if (!dados.preco || dados.preco <= 0) {
        throw new Error('Preço deve ser maior que zero');
      }
      if (!dados.categoria) {
        throw new Error('Categoria é obrigatória');
      }
      if (!dados.imagens || !dados.imagens.length) {
        throw new Error('Pelo menos uma imagem é obrigatória');
      }

      // Criar referência para novo documento com auto-id seguro no Firestore v9
      const { doc, collection } = require('firebase/firestore');
      const { getDb } = require('../config/firebase');
      const docRef = doc(collection(getDb(), this.collectionName));

      // Preparar dados do produto
      const novoProduto: Product = {
        id: docRef.id,
        nome: dados.nome,
        descricao: dados.descricao || '',
        preco: dados.preco,
        categoria: dados.categoria,
        disponivel: dados.disponivel ?? true,
        imagens: dados.imagens,
        ingredientes: dados.ingredientes || [],
        tempoPreparacao: dados.tempoPreparacao,
        destacado: dados.destacado || false,
        pesoAproximado: dados.pesoAproximado,
        informacoesNutricionais: dados.informacoesNutricionais,
        avaliacoes: [],
        dataCriacao: new Date(),
        estoque: dados.estoque,
        temEstoque: dados.temEstoque || false,
        alergenos: dados.alergenos || [],
        tagsEspeciais: dados.tagsEspeciais || [],
      };

      // Salvar no Firestore
      await f.setDoc(docRef, novoProduto as any);
      loggingService.info('Produto criado com sucesso', { id: novoProduto.id });

      return novoProduto;
    } catch (error: any) {
      loggingService.error('Erro ao criar produto', { error: error.message });
      throw error;
    }
  }

  /**
   * Consulta um produto pelo ID (Alias para consultarProduto)
   * @param id ID do produto
   * @returns Produto encontrado
   */
  public async getProductById(id: string): Promise<Product> {
    return this.consultarProduto(id);
  }

  /**
   * Consulta um produto pelo ID
   * @param id ID do produto
   * @returns Produto encontrado
   */
  public async consultarProduto(id: string): Promise<Product> {
    try {
      const docRef = f.doc(this.collectionName, id);
      const docSnap = await f.getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      return { id: docSnap.id, ...(docSnap.data() as any) } as Product;
    } catch (error: any) {
      loggingService.error('Erro ao consultar produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Lista todos os produtos (Alias para listarProdutos)
   * @param filtro Filtros para a consulta
   * @returns Lista de produtos
   */
  public async getProducts(filtro?: ProductFilter): Promise<Product[]> {
    return this.listarProdutos(filtro);
  }

  /**
   * Lista todos os produtos com filtros opcionais
   * @param filtro Filtros para a consulta
   * @returns Lista de produtos
   */
  public async listarProdutos(filtro?: ProductFilter): Promise<Product[]> {
    try {
      const produtosRef = f.collection(this.collectionName);
      let q = f.query(produtosRef);

      if (filtro) {
        if (filtro.categoria) {
          q = f.query(q, f.where('categoria', '==', filtro.categoria));
        }
        if (filtro.disponivel !== undefined) {
          q = f.query(q, f.where('disponivel', '==', filtro.disponivel));
        }
        if (filtro.destacado !== undefined) {
          q = f.query(q, f.where('destacado', '==', filtro.destacado));
        }
        if (filtro.tags && filtro.tags.length > 0) {
          q = f.query(q, f.where('tagsEspeciais', 'array-contains-any', filtro.tags));
        }
        if (filtro.ordenarPor) {
          q = f.query(q, f.orderBy(filtro.ordenarPor, filtro.ordem || 'asc'));
        }
        if (filtro.limite) {
          q = f.query(q, f.limit(filtro.limite));
        }
      }

      const querySnapshot = await f.getDocs(q);
      const produtos: Product[] = [];
      querySnapshot.docs.forEach((doc: any) => {
        produtos.push({ id: doc.id, ...(doc.data() as any) } as Product);
      });

      return produtos;
    } catch (error: any) {
      loggingService.error('Erro ao listar produtos', { error: error.message });
      throw error;
    }
  }

  /**
   * Atualiza os dados de um produto existente
   * @param id ID do produto
   * @param dados Novos dados
   */
  public async atualizarProduto(id: string, dados: Partial<Product>): Promise<Product> {
    try {
      const docRef = f.doc(this.collectionName, id);
      const updateData = {
        ...dados,
        dataAtualizacao: new Date(),
      };
      await f.updateDoc(docRef, updateData as any);
      loggingService.info('Produto atualizado com sucesso', { id });
      
      return await this.consultarProduto(id);
    } catch (error: any) {
      loggingService.error('Erro ao atualizar produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Atualiza o preço de um produto
   * @param id ID do produto
   * @param novoPreco Novo preço
   */
  public async atualizarPreco(id: string, novoPreco: number): Promise<Product> {
    return this.atualizarProduto(id, { preco: novoPreco });
  }

  /**
   * Atualiza a disponibilidade de um produto
   * @param id ID do produto
   * @param disponivel Status de disponibilidade
   */
  public async atualizarDisponibilidade(id: string, disponivel: boolean): Promise<Product> {
    return this.atualizarProduto(id, { disponivel });
  }

  /**
   * Lista todas as categorias de produtos cadastradas
   */
  public async listarCategorias(): Promise<string[]> {
    try {
      const snapshot = await f.getDocs(f.collection(this.collectionName));
      const categorias = new Set<string>();
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data() as Product;
        if (data.categoria) categorias.add(data.categoria);
      });
      return Array.from(categorias).sort();
    } catch (error: any) {
      loggingService.error('Erro ao listar categorias', { error: error.message });
      throw error;
    }
  }

  /**
   * Remove um produto (soft delete ou hard delete)
   * @param id ID do produto
   */
  public async excluirProduto(id: string): Promise<void> {
    try {
      const docRef = f.doc(this.collectionName, id);
      await f.deleteDoc(docRef);
      loggingService.info('Produto excluído com sucesso', { id });
    } catch (error: any) {
      loggingService.error('Erro ao excluir produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Obtém estatísticas dos produtos (Ex: mais vendidos, categorias populares)
   * @returns Estatísticas consolidadas
   */
  public async obterEstatisticas(): Promise<ProductStats> {
    try {
      const snapshot = await f.getDocs(f.collection(this.collectionName));
      const totalProdutos = snapshot.size;
      const categoriasSet = new Set<string>();
      let emEstoque = 0;
      let destacados = 0;

      snapshot.docs.forEach((doc: any) => {
        const data = doc.data() as Product;
        if (data.categoria) categoriasSet.add(data.categoria);
        if (data.disponivel) emEstoque++;
        if (data.destacado) destacados++;
      });

      const stats: ProductStats = {
        total: totalProdutos,
        categorias: {} as Record<string, number>,
        destacados,
      };

      snapshot.docs.forEach((doc: any) => {
        const data = doc.data() as Product;
        if (data.categoria) {
          stats.categorias![data.categoria] = (stats.categorias![data.categoria] || 0) + 1;
        }
      });

      return stats;
    } catch (error: any) {
      loggingService.error('Erro ao obter estatísticas de produtos', { error: error.message });
      throw error;
    }
  }

  /**
   * Busca produtos por termo (nome ou descrição)
   * @param termo Termo de busca
   * @returns Produtos que atendem ao critério
   */
  public async buscarProdutos(termo: string): Promise<Product[]> {
    try {
      const snapshot = await f.getDocs(f.collection(this.collectionName));
      const termoNormalizado = termo.toLowerCase();

      const produtos: Product[] = [];
      snapshot.docs.forEach((doc: any) => {
        const produto = { id: doc.id, ...(doc.data() as any) } as Product;
        if (
          produto.nome.toLowerCase().includes(termoNormalizado) ||
          produto.descricao.toLowerCase().includes(termoNormalizado)
        ) {
          produtos.push(produto);
        }
      });

      return produtos;
    } catch (error: any) {
      loggingService.error('Erro ao buscar produtos', { termo, error: error.message });
      throw error;
    }
  }

  /**
   * Consulta produtos destacados (usado na home)
   */
  public async consultarDestaques(): Promise<Product[]> {
    try {
      const q = f.query(
        f.collection(this.collectionName),
        f.where('destacado', '==', true),
        f.where('disponivel', '==', true),
        f.limit(10)
      );

      const snapshot = await f.getDocs(q);
      const produtos: Product[] = [];
      snapshot.docs.forEach((doc: any) => {
        const produto = { id: doc.id, ...(doc.data() as any) } as Product;
        produtos.push(produto);
      });

      return produtos;
    } catch (error: any) {
      loggingService.error('Erro ao consultar destaques', { error: error.message });
      throw error;
    }
  }

  /**
   * Alias para consultarDestaques
   */
  public async listarProdutosDestacados(): Promise<Product[]> {
    return this.consultarDestaques();
  }

  /**
   * Atualiza o estoque de um produto
   * @param id ID do produto
   * @param quantidade Nova quantidade
   */
  public async atualizarEstoque(id: string, quantidade: number): Promise<Product> {
    try {
      const docRef = f.doc(this.collectionName, id);
      await f.updateDoc(docRef, {
        estoque: quantidade,
        temEstoque: quantidade > 0,
        dataAtualizacao: new Date()
      } as any);
      loggingService.info('Estoque atualizado com sucesso', { id, quantidade });
      return await this.consultarProduto(id);
    } catch (error: any) {
      loggingService.error('Erro ao atualizar estoque', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Obtém estatísticas básicas de um produto específico
   * @param id ID do produto
   */
  public async obterEstatisticasProduto(id: string): Promise<any> {
    try {
      const produto = await this.consultarProduto(id);
      return {
        id: produto.id,
        nome: produto.nome,
        estoqueAtual: produto.estoque || 0,
        disponivel: produto.disponivel,
        totalVendas: 0, // Placeholder
      };
    } catch (error: any) {
      loggingService.error('Erro ao obter estatísticas do produto', { id, error: error.message });
      throw error;
    }
  }
}

export const productService = ProductService.getInstance();
