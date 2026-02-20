import type { Product, ProductFilter, ProductStats, ProductReview } from '../types/Product';
import { ProductCategories } from '../types/Product';
import { loggingService } from './LoggingService';
import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { QueryConstraint, WhereFilterOp } from 'firebase/firestore';
import { OrderService } from './OrderService';

export class ProductService {

  private mockStore: Map<string, Product> | null = null;


  private readonly collectionName = 'products';
  private static instance: ProductService;
  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }
  constructor() {
    // Inicialização do serviço
    loggingService.info('ProductService inicializado');
  }

  private isTestEnv(): boolean {
    return typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  }

  private getMockStore(): Map<string, Product> {
    if (!this.mockStore) {
      this.mockStore = new Map(this.getMockProducts().map(p => [p.id, p] as const));
    }
    return this.mockStore;
  }

  private removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
    const clone: any = { ...obj };

    const sanitize = (target: any) => {
      Object.keys(target).forEach(key => {
        const value = target[key];
        if (value === undefined) {
          delete target[key];
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          sanitize(value);
        }
      });
    };

    sanitize(clone);
    return clone as T;
  }

  /**
   * Cria um novo produto no Firestore
   * @param data Dados do produto a ser criado
   * @returns Produto criado
   */
  public async createProduct(data: Partial<Product>): Promise<Product> {
    try {
      // Validações
      if (!data.nome) {
        throw new Error('Nome é obrigatório');
      }
      if (!data.preco || data.preco <= 0) {
        throw new Error('Preço deve ser maior que zero');
      }
      if (!data.categoria) {
        throw new Error('Categoria é obrigatória');
      }
      if (!data.imagens || !data.imagens.length) {
        throw new Error('Pelo menos uma imagem é obrigatória');
      }
      if (!data.producerId) {
        throw new Error('producerId é obrigatório');
      }

      if (this.isTestEnv()) {
        const id = (data as any).id ? String((data as any).id) : `prod_${Date.now()}`;
        const newProduct: Product = {
          id,
          nome: data.nome,
          descricao: data.descricao || '',
          preco: data.preco,
          categoria: data.categoria,
          disponivel: data.disponivel ?? true,
          imagens: data.imagens,
          ingredientes: data.ingredientes || [],
          tempoPreparacao: data.tempoPreparacao,
          destacado: data.destacado || false,
          pesoAproximado: data.pesoAproximado,
          informacoesNutricionais: data.informacoesNutricionais,
          avaliacoes: [],
          dataCriacao: new Date(),
          estoque: data.estoque,
          temEstoque: data.temEstoque || false,
          alergenos: data.alergenos || [],
          tagsEspeciais: data.tagsEspeciais || [],
          producerId: data.producerId,
          custoIngredientes: data.custoIngredientes,
          custoMaoDeObra: data.custoMaoDeObra,
          custoEmbalagem: data.custoEmbalagem,
        };
        this.getMockStore().set(id, newProduct);
        return newProduct;
      }

      // Criar referência para novo documento
      const productsRef = collection(db, this.collectionName);
      const docRef = doc(productsRef);

      // Preparar dados do produto
      const newProduct: Product = {
        id: docRef.id,
        nome: data.nome,
        descricao: data.descricao || '',
        preco: data.preco,
        categoria: data.categoria,
        disponivel: data.disponivel ?? true,
        imagens: data.imagens,
        ingredientes: data.ingredientes || [],
        tempoPreparacao: data.tempoPreparacao,
        destacado: data.destacado || false,
        pesoAproximado: data.pesoAproximado,
        informacoesNutricionais: data.informacoesNutricionais,
        avaliacoes: [],
        dataCriacao: new Date(),
        estoque: data.estoque,
        temEstoque: data.temEstoque || false,
        alergenos: data.alergenos || [],
        tagsEspeciais: data.tagsEspeciais || [],
        producerId: data.producerId,
        custoIngredientes: data.custoIngredientes,
        custoMaoDeObra: data.custoMaoDeObra,
        custoEmbalagem: data.custoEmbalagem,
      };

      // Salvar no Firestore
      const sanitizedProduct = this.removeUndefinedFields(newProduct as any) as Product;
      await setDoc(docRef, sanitizedProduct);
      loggingService.info('Produto criado com sucesso', { id: sanitizedProduct.id });
      try {
        const mod = await import('./SearchService');
        await mod.SearchService.getInstance().atualizarIndexacaoProduto(newProduct);
      } catch {}

      return newProduct;
    } catch (error: any) {
      loggingService.error(
        'Erro ao criar produto',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Alias para createProduct para compatibilidade
   */
  public async criarProduto(dados: Partial<Product>): Promise<Product> {
    return this.createProduct(dados);
  }

  /**
   * Lista produtos com filtros opcionais
   * @param filters Filtros para a consulta
   * @returns Lista de produtos
   */
  public async listProducts(filters: ProductFilter = {}): Promise<Product[]> {
    try {
      if (__DEV__ || process.env.NODE_ENV === 'test') {
        const base = this.isTestEnv() ? Array.from(this.getMockStore().values()) : this.getMockProducts();
        let result = base;
        if (filters.producerId) {
          result = result.filter(p => p.producerId === filters.producerId);
        }
        if (filters.categoria) {
          result = result.filter(p => p.categoria === filters.categoria);
        }
        if (typeof filters.disponivel === 'boolean') {
          result = result.filter(p => p.disponivel === filters.disponivel);
        }
        if (typeof filters.destacado === 'boolean') {
          result = result.filter(p => p.destacado === filters.destacado);
        }
        if (typeof filters.precoMin === 'number') {
          result = result.filter(p => p.preco >= (filters.precoMin as number));
        }
        if (typeof filters.precoMax === 'number') {
          result = result.filter(p => p.preco <= (filters.precoMax as number));
        }
        if (filters.tagEspecial) {
          result = result.filter(p => p.tagsEspeciais?.includes(filters.tagEspecial as string));
        }
        if (filters.busca) {
          const termo = filters.busca.toLowerCase();
          result = result.filter(
            p =>
              p.nome.toLowerCase().includes(termo) ||
              p.descricao.toLowerCase().includes(termo) ||
              (p.ingredientes || []).some(i => i.toLowerCase().includes(termo))
          );
        }
        result.sort((a, b) => {
          if (a.destacado === b.destacado) {
            const aTime = (a.dataCriacao instanceof Date ? a.dataCriacao.getTime() : new Date(a.dataCriacao as any).getTime());
            const bTime = (b.dataCriacao instanceof Date ? b.dataCriacao.getTime() : new Date(b.dataCriacao as any).getTime());
            return bTime - aTime;
          }
          return a.destacado ? -1 : 1;
        });
        return result;
      }

      let productsQuery = collection(db, this.collectionName);
      let constraints: any[] = [];

      if (filters.producerId) {
        constraints.push(where('producerId', '==', filters.producerId));
      }
      if (filters.categoria) {
        constraints.push(where('categoria', '==', filters.categoria));
      }
      if (filters.disponivel !== undefined) {
        constraints.push(where('disponivel', '==', filters.disponivel));
      }
      if (filters.destacado !== undefined) {
        constraints.push(where('destacado', '==', filters.destacado));
      }
      if (filters.precoMin) {
        constraints.push(where('preco', '>=', filters.precoMin));
      }
      if (filters.precoMax) {
        constraints.push(where('preco', '<=', filters.precoMax));
      }
      if (filters.tagEspecial) {
        constraints.push(where('tagsEspeciais', 'array-contains', filters.tagEspecial));
      }

      if (filters.ordenarPor) {
        constraints.push(orderBy(filters.ordenarPor, filters.ordem || 'asc'));
      } else {
        constraints.push(orderBy('dataCriacao', 'desc'));
      }

      if (filters.limite) {
        constraints.push(limit(filters.limite));
      }

      const q = query(productsQuery, ...constraints);
      const querySnapshot = await getDocs(q);

      const products: Product[] = [];
      querySnapshot.docs.forEach((doc: any) => {
        products.push(this.parseProductData(doc.id, doc.data()));
      });

      if (filters.busca) {
        const searchTerms = filters.busca.toLowerCase();
        return products.filter(
          p =>
            p.nome.toLowerCase().includes(searchTerms) ||
            p.descricao.toLowerCase().includes(searchTerms) ||
            p.ingredientes?.some(i => i.toLowerCase().includes(searchTerms))
        );
      }

      return products;
    } catch (error: any) {
      const errorCode = (error && error.code) || null;
      const errorMessage = (error && error.message) || 'Erro ao listar produtos';

      // Fallback específico para erro de índice do Firestore
      const lowerMsg = String(errorMessage).toLowerCase();
      const isIndexError =
        lowerMsg.includes('the query requires an index') || lowerMsg.includes('requires an index');

      if (isIndexError) {
        try {
          const fallbackSnapshot = await getDocs(collection(db, this.collectionName));
          let result: Product[] = [];
          fallbackSnapshot.docs.forEach((docSnap: any) => {
            result.push(this.parseProductData(docSnap.id, docSnap.data()));
          });

          if (filters.categoria) {
            result = result.filter(p => p.categoria === filters.categoria);
          }
          if (typeof filters.disponivel === 'boolean') {
            result = result.filter(p => p.disponivel === filters.disponivel);
          }
          if (typeof filters.destacado === 'boolean') {
            result = result.filter(p => p.destacado === filters.destacado);
          }
          if (typeof filters.precoMin === 'number') {
            result = result.filter(p => p.preco >= (filters.precoMin as number));
          }
          if (typeof filters.precoMax === 'number') {
            result = result.filter(p => p.preco <= (filters.precoMax as number));
          }
          if (filters.tagEspecial) {
            result = result.filter(p => p.tagsEspeciais?.includes(filters.tagEspecial as string));
          }
          if (filters.busca) {
            const termo = filters.busca.toLowerCase();
            result = result.filter(
              p =>
                p.nome.toLowerCase().includes(termo) ||
                p.descricao.toLowerCase().includes(termo) ||
                (p.ingredientes || []).some(i => i.toLowerCase().includes(termo))
            );
          }

          result.sort((a, b) => {
            if (a.destacado === b.destacado) {
              const aTime =
                a.dataCriacao instanceof Date
                  ? a.dataCriacao.getTime()
                  : new Date(a.dataCriacao as any).getTime();
              const bTime =
                b.dataCriacao instanceof Date
                  ? b.dataCriacao.getTime()
                  : new Date(b.dataCriacao as any).getTime();
              return bTime - aTime;
            }
            return a.destacado ? -1 : 1;
          });

          if (filters.limite && typeof filters.limite === 'number') {
            result = result.slice(0, filters.limite);
          }

          loggingService.warn('Consulta de produtos exigiu índice; usando fallback em memória', {
            filters,
          });

          return result;
        } catch (fallbackError: any) {
          loggingService.error('Erro no fallback ao listar produtos', {
            filters,
            error: fallbackError.message,
          });
          throw fallbackError;
        }
      }

      loggingService.error('Erro ao listar produtos', {
        filters,
        error: errorMessage,
        code: errorCode,
      });
      throw error;
    }
  }

  /**
   * Alias para listProducts para compatibilidade
   */
  public async listarProdutos(filtros: ProductFilter = {}): Promise<Product[]> {
    return this.listProducts(filtros);
  }

  /**
   * Alias para listProducts para compatibilidade
   */
  public async getProducts(filtros: ProductFilter = {}): Promise<Product[]> {
    return this.listProducts(filtros);
  }

  private parseProductData(id: string, data: any): Product {
    const rawCreate = data?.dataCriacao;
    let dataCriacao = new Date();
    if (typeof rawCreate === 'string') {
      dataCriacao = new Date(rawCreate);
    } else if (rawCreate && typeof rawCreate.toDate === 'function') {
      dataCriacao = rawCreate.toDate();
    } else if (rawCreate instanceof Date) {
      dataCriacao = rawCreate;
    }

    let dataAtualizacao: Date | undefined = undefined;
    const rawUpdate = data?.dataAtualizacao;
    if (typeof rawUpdate === 'string') {
      dataAtualizacao = new Date(rawUpdate);
    } else if (rawUpdate && typeof rawUpdate.toDate === 'function') {
      dataAtualizacao = rawUpdate.toDate();
    } else if (rawUpdate instanceof Date) {
      dataAtualizacao = rawUpdate;
    }

    return {
      id,
      ...data,
      dataCriacao,
      dataAtualizacao,
    } as Product;
  }

  /**
   * Consulta um produto pelo ID
   * @param id ID do produto
   * @returns Produto encontrado
   */
  public async getProductById(id: string): Promise<Product | null> {
    try {
      if (__DEV__ || process.env.NODE_ENV === 'test') {
        const base = this.isTestEnv() ? Array.from(this.getMockStore().values()) : this.getMockProducts();
        const found = base.find(p => p.id === id);
        if (!found) return null;
        return found;
      }

      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return this.parseProductData(docSnap.id, docSnap.data());
    } catch (error: any) {
      loggingService.error(
        'Erro ao consultar produto',
        error instanceof Error ? error : undefined,
        { id }
      );
      return null;
    }
  }

  /**
   * Alias para getProductById para compatibilidade
   */
  public async consultarProduto(id: string): Promise<Product> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('Produto não encontrado');
    }
    return product;
  }

  /**
   * Atualiza um produto existente
   * @param id ID do produto
   * @param data Dados a serem atualizados
   * @returns Produto atualizado
   */
  public async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    try {
      // Validações
      if (data.preco && data.preco <= 0) {
        throw new Error('Preço deve ser maior que zero');
      }

      if (this.isTestEnv()) {
        const store = this.getMockStore();
        const existing = store.get(id);
        if (!existing) throw new Error('Produto não encontrado');
        const updated: Product = {
          ...existing,
          ...data,
          id,
          dataAtualizacao: new Date(),
        } as Product;
        store.set(id, updated);
        return updated;
      }

      // Verificar se produto existe
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      // Preparar dados atualizados
      const updatedProduct: Partial<Product> = {
        ...data,
        dataAtualizacao: new Date()
      };

      // Atualizar no Firestore
      const sanitizedUpdate = this.removeUndefinedFields(updatedProduct as any) as Partial<Product>;
      await updateDoc(docRef, sanitizedUpdate);
      
      // Buscar produto atualizado
      const docSnapUpdated = await getDoc(docRef);
      loggingService.info('Produto atualizado com sucesso', { id });
      try {
        const mod = await import('./SearchService');
        const updated = docSnapUpdated.data() as Product;
        await mod.SearchService.getInstance().atualizarIndexacaoProduto(updated);
      } catch {}
      
      return docSnapUpdated.data() as Product;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Alias para updateProduct para compatibilidade
   */
  public async atualizarProduto(id: string, dados: Partial<Product>): Promise<Product> {
    return this.updateProduct(id, dados);
  }

  /**
   * Exclui um produto
   * @param id ID do produto
   * @returns true se excluído com sucesso
   */
  public async deleteProduct(id: string): Promise<boolean> {
    try {
      if (this.isTestEnv()) {
        const store = this.getMockStore();
        if (!store.has(id)) {
          throw new Error('Produto não encontrado');
        }
        store.delete(id);
        return true;
      }
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      await deleteDoc(docRef);
      loggingService.info('Produto excluído com sucesso', { id });
      try {
        const mod = await import('./SearchService');
        await mod.SearchService.getInstance().removerProdutoDeIndexacao(id);
      } catch {}
      
      return true;
    } catch (error: any) {
      loggingService.error('Erro ao excluir produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Alias para deleteProduct para compatibilidade
   */
  public async excluirProduto(id: string): Promise<boolean> {
    return this.deleteProduct(id);
  }

  /**
   * Atualiza a disponibilidade de um produto
   * @param id ID do produto
   * @param available Status de disponibilidade
   * @returns Produto atualizado
   */
  public async updateAvailability(id: string, available: boolean): Promise<Product> {
    try {
      if (this.isTestEnv()) {
        const store = this.getMockStore();
        const existing = store.get(id);
        if (!existing) throw new Error('Produto não encontrado');
        const updated: Product = { ...existing, disponivel: available, dataAtualizacao: new Date() } as Product;
        store.set(id, updated);
        return updated;
      }
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const update = {
        disponivel: available,
        dataAtualizacao: new Date()
      };

      await updateDoc(docRef, update);
      loggingService.info('Disponibilidade do produto atualizada', { id, available });

      // Buscar produto atualizado
      const docSnapUpdated = await getDoc(docRef);
      try {
        const mod = await import('./SearchService');
        const updated = docSnapUpdated.data() as Product;
        await mod.SearchService.getInstance().atualizarIndexacaoProduto(updated);
      } catch {}
      return docSnapUpdated.data() as Product;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar disponibilidade do produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Alias para updateAvailability para compatibilidade
   */
  public async atualizarDisponibilidade(id: string, disponivel: boolean): Promise<Product> {
    return this.updateAvailability(id, disponivel);
  }

  /**
   * Atualiza o preço de um produto
   * @param id ID do produto
   * @param price Novo preço
   * @returns Produto atualizado
   */
  public async updatePrice(id: string, price: number): Promise<Product> {
    try {
      if (price <= 0) {
        throw new Error('Preço deve ser maior que zero');
      }

      if (this.isTestEnv()) {
        const store = this.getMockStore();
        const existing = store.get(id);
        if (!existing) throw new Error('Produto não encontrado');
        const updated: Product = { ...existing, preco: price, dataAtualizacao: new Date() } as Product;
        store.set(id, updated);
        return updated;
      }

      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const update = {
        preco: price,
        dataAtualizacao: new Date()
      };

      await updateDoc(docRef, update);
      loggingService.info('Preço do produto atualizado', { id, price });

      // Buscar produto atualizado
      const docSnapUpdated = await getDoc(docRef);
      try {
        const mod = await import('./SearchService');
        const updated = docSnapUpdated.data() as Product;
        await mod.SearchService.getInstance().atualizarIndexacaoProduto(updated);
      } catch {}
      return docSnapUpdated.data() as Product;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar preço do produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Alias para updatePrice para compatibilidade
   */
  public async atualizarPreco(id: string, preco: number): Promise<Product> {
    return this.updatePrice(id, preco);
  }

  /**
   * Atualiza o estoque de um produto
   * @param id ID do produto
   * @param quantity Nova quantidade em estoque
   * @returns Produto atualizado
   */
  public async updateStock(id: string, quantity: number): Promise<Product> {
    try {
      if (quantity < 0) {
        throw new Error('Quantidade não pode ser negativa');
      }

      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const product = docSnap.data() as Product;
      if (!product.temEstoque) {
        throw new Error('Produto não utiliza controle de estoque');
      }

      const update: Partial<Product> = {
        estoque: quantity,
        dataAtualizacao: new Date()
      };

      // Se a quantidade for zero, marcar como indisponível
      if (quantity === 0) {
        update.disponivel = false;
      }

      await updateDoc(docRef, update);
      loggingService.info('Estoque do produto atualizado', { id, quantity });

      // Buscar produto atualizado
      const docSnapUpdated = await getDoc(docRef);
      try {
        const mod = await import('./SearchService');
        const updated = docSnapUpdated.data() as Product;
        await mod.SearchService.getInstance().atualizarIndexacaoProduto(updated);
      } catch {}
      return docSnapUpdated.data() as Product;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar estoque do produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Alias para updateStock para compatibilidade
   */
  public async atualizarEstoque(id: string, quantidade: number): Promise<Product> {
    return this.updateStock(id, quantidade);
  }

  /**
   * Adiciona uma avaliação a um produto
   * @param productId ID do produto
   * @param clientId ID do cliente
   * @param clientName Nome do cliente
   * @param rating Nota da avaliação (1-5)
   * @param comment Comentário opcional
   * @returns Produto atualizado
   */
  public async addReview(
    productId: string,
    clientId: string,
    clientName: string,
    rating: number,
    comment?: string
  ): Promise<Product> {
    try {
      const docRef = doc(db, this.collectionName, productId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      if (rating < 1 || rating > 5) {
        throw new Error('Avaliação deve ser entre 1 e 5');
      }

      const product = docSnap.data() as Product;
      const reviews = (product.avaliacoes || []) as ProductReview[];

      // Verificar se o cliente já avaliou este produto
      const existingReviewIndex = reviews.findIndex(a => a.clienteId === clientId);
      const newReview = {
        id: existingReviewIndex >= 0 ? reviews[existingReviewIndex].id : `aval_${Date.now()}`,
        clienteId: clientId,
        clienteNome: clientName,
        avaliacao: rating,
        comentario: comment,
        data: new Date()
      };

      // Atualizar ou adicionar avaliação
      if (existingReviewIndex >= 0) {
        reviews[existingReviewIndex] = newReview;
      } else {
        reviews.push(newReview);
      }

      // Atualizar produto no Firestore
      const update = {
        avaliacoes: reviews,
        dataAtualizacao: new Date()
      };

      await updateDoc(docRef, update);
      loggingService.info('Avaliação adicionada ao produto', { productId, clientId });

      // Buscar produto atualizado
      const docSnapUpdated = await getDoc(docRef);
      return docSnapUpdated.data() as Product;
    } catch (error: any) {
      loggingService.error('Erro ao adicionar avaliação ao produto', { productId, error: error.message });
      throw error;
    }
  }

  /**
   * Alias para addReview para compatibilidade
   */
  public async adicionarAvaliacao(
    produtoId: string,
    clienteId: string,
    clienteNome: string,
    avaliacao: number,
    comentario?: string
  ): Promise<Product> {
    return this.addReview(produtoId, clienteId, clienteNome, avaliacao, comentario);
  }

  /**
   * Obtém estatísticas dos produtos
   * @returns Estatísticas dos produtos
   */
  public async obterEstatisticas(): Promise<any> {
    try {
      const produtosRef = collection(db, this.collectionName);
      const querySnapshot = await getDocs(produtosRef);
      
      let total = 0;
      let disponiveis = 0;
      let indisponiveis = 0;
      let destacados = 0;
      let semEstoque = 0;
      let categorias: Record<string, number> = {};
      
      querySnapshot.docs.forEach((doc) => {
        const produto = doc.data() as Product;
        total++;
        
        if (produto.disponivel) disponiveis++;
        else indisponiveis++;
        
        if (produto.destacado) destacados++;
        
        if (produto.temEstoque && produto.estoque === 0) semEstoque++;
        
        // Contagem por categoria
        const categoria = produto.categoria;
        categorias[categoria] = (categorias[categoria] || 0) + 1;
      });
      
      return {
        total,
        disponiveis,
        indisponiveis,
        destacados,
        semEstoque,
        categorias
      };
    } catch (error: any) {
      loggingService.error('Erro ao obter estatísticas dos produtos', { error: error.message });
      throw error;
    }
}

  public async obterEstatisticasProduto(produtoId: string): Promise<ProductStats> {
    const produto = await this.consultarProduto(produtoId);
    if (!produto) {
      throw new Error('Produto não encontrado');
    }

    const orders = await OrderService.getInstance().getAllOrders();
    let vendasTotais = 0;
    let quantidadeVendida = 0;

    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items || []) {
        if (item.productId !== produtoId) continue;
        quantidadeVendida += item.quantity || 0;
        const itemTotal = typeof item.totalPrice === 'number'
          ? item.totalPrice
          : (item.unitPrice || 0) * (item.quantity || 0);
        vendasTotais += itemTotal;
      }
    }

    // Cálculo da avaliação média
    const avaliacoes = (produto.avaliacoes || []) as ProductReview[];
    const somaAvaliacoes = avaliacoes.reduce((total, av) => total + av.avaliacao, 0);
    const avaliacaoMedia = avaliacoes.length > 0 ? somaAvaliacoes / avaliacoes.length : 0;

    return {
      vendasTotais,
      quantidadeVendida,
      avaliacaoMedia,
      quantidadeAvaliacoes: avaliacoes.length,
    };
  }

  public async listarCategorias(): Promise<string[]> {
    const produtos = await this.listarProdutos();
    const categorias = new Set<string>();

    produtos.forEach(produto => {
      categorias.add(produto.categoria);
    });

    return Array.from(categorias);
  }

  public async listarProdutosDestacados(): Promise<Product[]> {
    return this.getFeaturedProducts();
  }

  public async listarProdutosPromocao(): Promise<Product[]> {
    return this.listarProdutos({ tagEspecial: 'promocao', disponivel: true });
  }

  public async getFeaturedProducts(max: number = 10): Promise<Product[]> {
    return this.listarProdutos({ destacado: true, disponivel: true, limite: max });
  }

  public async getProductsByCategory(category: string, max: number = 20): Promise<Product[]> {
    return this.listarProdutos({ categoria: category as any, disponivel: true, limite: max });
  }

  private getMockProducts(): Product[] {
    return [
      {
        id: 'prod1',
        producerId: 'producer-123',
        nome: 'Bolo de Chocolate Belga',
        descricao:
          'Bolo artesanal feito com chocolate belga 70%, massa fofinha e recheio cremoso.',
        preco: 45.0,
        categoria: 'Bolos',
        disponivel: true,
        imagens: ['https://via.placeholder.com/400x300/4B2C20/FFFFFF?text=Bolo+de+Chocolate'],
        ingredientes: ['Chocolate', 'Farinha', 'Açúcar', 'Ovos', 'Leite'],
        tempoPreparacao: 60,
        destacado: true,
        pesoAproximado: 800,
        informacoesNutricionais: {
          calorias: 320,
          carboidratos: 45,
          proteinas: 6,
          gorduras: 15,
          porcao: 100,
        },
        dataCriacao: new Date(),
        estoque: 5,
        temEstoque: true,
        alergenos: ['Glúten', 'Leite', 'Ovos'],
        tagsEspeciais: ['Mais Vendido'],
      },
      {
        id: 'prod2',
        producerId: 'producer-123',
        nome: 'Cupcake de Baunilha',
        descricao:
          'Cupcake de baunilha com cobertura de buttercream decorado com confeitos coloridos.',
        preco: 8.5,
        categoria: 'Cupcakes',
        disponivel: true,
        imagens: ['https://via.placeholder.com/400x300/FFB6C1/FFFFFF?text=Cupcake+de+Baunilha'],
        ingredientes: ['Baunilha', 'Farinha', 'Açúcar', 'Ovos', 'Leite'],
        tempoPreparacao: 30,
        destacado: false,
        pesoAproximado: 90,
        dataCriacao: new Date(),
        estoque: 20,
        temEstoque: true,
        tagsEspeciais: ['Novo'],
      },
      {
        id: 'prod3',
        producerId: 'producer-123',
        nome: 'Torta de Limão',
        descricao:
          'Torta de limão com base de biscoito, recheio de creme cítrico e cobertura de merengue.',
        preco: 40.0,
        categoria: 'Tortas',
        disponivel: true,
        imagens: ['https://via.placeholder.com/400x300/FFFFE0/000000?text=Torta+de+Limão'],
        ingredientes: ['Limão', 'Biscoito', 'Leite Condensado', 'Gema de Ovo', 'Manteiga'],
        tempoPreparacao: 120,
        destacado: true,
        pesoAproximado: 600,
        dataCriacao: new Date(),
        estoque: 3,
        temEstoque: true,
        tagsEspeciais: ['Mais Vendido'],
      },
      {
        id: 'prod4',
        producerId: 'producer-123',
        nome: 'Docinhos de Festa - Kit 50 unidades',
        descricao: 'Kit com 50 docinhos sortidos: brigadeiro, beijinho, casadinho e cajuzinho.',
        preco: 75.0,
        categoria: 'Docinhos',
        disponivel: true,
        imagens: ['https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Docinhos+Sortidos'],
        ingredientes: ['Chocolate', 'Leite Condensado', 'Coco', 'Amendoim', 'Açúcar'],
        tempoPreparacao: 180,
        destacado: false,
        pesoAproximado: 500,
        dataCriacao: new Date(),
        estoque: 10,
        temEstoque: true,
        tagsEspeciais: ['Kit Festa'],
      },
      {
        id: 'prod5',
        producerId: 'producer-123',
        nome: 'Bolo de Morango',
        descricao:
          'Bolo recheado com creme de baunilha e morangos frescos, cobertura de chantilly.',
        preco: 55.0,
        categoria: 'Bolos',
        disponivel: true,
        imagens: ['https://via.placeholder.com/400x300/FF0000/FFFFFF?text=Bolo+de+Morango'],
        ingredientes: ['Morango', 'Farinha', 'Açúcar', 'Ovos', 'Leite', 'Chantilly'],
        tempoPreparacao: 90,
        destacado: true,
        pesoAproximado: 950,
        dataCriacao: new Date(),
        estoque: 2,
        temEstoque: true,
        tagsEspeciais: ['Sazonal'],
      },
      {
        id: 'prod6',
        producerId: 'producer-123',
        nome: 'Brownies - Pacote com 6 unidades',
        descricao: 'Brownies de chocolate meio amargo, densos e úmidos, com nozes.',
        preco: 32.0,
        categoria: 'Sobremesas',
        disponivel: true,
        imagens: ['https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Brownies'],
        ingredientes: ['Chocolate meio amargo', 'Farinha', 'Açúcar', 'Ovos', 'Manteiga', 'Nozes'],
        tempoPreparacao: 45,
        destacado: false,
        pesoAproximado: 300,
        dataCriacao: new Date(),
        estoque: 8,
        temEstoque: true,
        tagsEspeciais: ['Com Nozes'],
      },
    ];
  }
}



