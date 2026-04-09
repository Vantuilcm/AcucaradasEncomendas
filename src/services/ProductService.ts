import { db, f } from '../config/firebase';
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

      // Criar referência para novo documento
      const produtosRef = f.collection(db, this.collectionName);
      const docRef = f.doc(produtosRef);

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
   * Consulta um produto pelo ID
   * @param id ID do produto
   * @returns Produto encontrado
   */
  public async consultarProduto(id: string): Promise<Product> {
    try {
      const docRef = f.doc(db, this.collectionName, id);
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
   * Lista todos os produtos com filtros opcionais
   * @param filtro Filtros para a consulta
   * @returns Lista de produtos
   */
  public async listarProdutos(filtro?: ProductFilter): Promise<Product[]> {
    try {
      const produtosRef = f.collection(db, this.collectionName);
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
  public async atualizarProduto(id: string, dados: Partial<Product>): Promise<void> {
    try {
      const docRef = f.doc(db, this.collectionName, id);
      await f.updateDoc(docRef, {
        ...dados,
        dataAtualizacao: new Date(),
      } as any);
      loggingService.info('Produto atualizado com sucesso', { id });
    } catch (error: any) {
      loggingService.error('Erro ao atualizar produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Remove um produto (soft delete ou hard delete)
   * @param id ID do produto
   */
  public async excluirProduto(id: string): Promise<void> {
    try {
      const docRef = f.doc(db, this.collectionName, id);
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
      const snapshot = await f.getDocs(f.collection(db, this.collectionName));
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
      const snapshot = await f.getDocs(f.collection(db, this.collectionName));
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
        f.collection(db, this.collectionName),
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
}

export const productService = ProductService.getInstance();
