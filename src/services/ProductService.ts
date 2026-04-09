import { f } from '../config/firebase';
import { Product, ProductFilter, ProductStats } from '../types/Product';
import { loggingService } from './LoggingService';
import { db } from '../config/firebase';
const { collection, getDocs, doc, getDoc, query, where, orderBy, limit, setDoc, updateDoc, deleteDoc } = f;

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
      const produtosRef = collection(db, this.collectionName);
      const docRef = doc(produtosRef);

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
      await setDoc(docRef, novoProduto as any);
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
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

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
   * Atualiza um produto existente
   * @param id ID do produto
   * @param dados Dados a serem atualizados
   * @returns Produto atualizado
   */
  public async atualizarProduto(id: string, dados: Partial<Product>): Promise<Product> {
    try {
      // Validações
      if (dados.preco && dados.preco <= 0) {
        throw new Error('Preço deve ser maior que zero');
      }

      // Verificar se produto existe
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      // Preparar dados atualizados
      const produtoAtualizado: any = {
        ...dados,
        dataAtualizacao: new Date()
      };

      // Atualizar no Firestore
      await updateDoc(docRef, produtoAtualizado);
      
      // Buscar produto atualizado
      const docSnapAtualizado = await getDoc(docRef);
      loggingService.info('Produto atualizado com sucesso', { id });
      
      return { id: docSnapAtualizado.id, ...(docSnapAtualizado.data() as any) } as Product;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Exclui um produto
   * @param id ID do produto
   * @returns true se excluído com sucesso
   */
  public async excluirProduto(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      await deleteDoc(docRef);
      loggingService.info('Produto excluído com sucesso', { id });
      
      return true;
    } catch (error: any) {
      loggingService.error('Erro ao excluir produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Lista produtos com filtros opcionais
   * @param filtros Filtros para a consulta
   * @returns Lista de produtos
   */
  public async listarProdutos(filtros: ProductFilter = {}): Promise<Product[]> {
    try {
      // Construir a consulta base
      let produtosQuery = collection(db, this.collectionName);
      let constraints: any[] = [];

      // Aplicar filtros
      if (filtros.categoria) {
        constraints.push(where('categoria', '==', filtros.categoria));
      }

      if (filtros.disponivel !== undefined) {
        constraints.push(where('disponivel', '==', filtros.disponivel));
      }

      if (filtros.destacado !== undefined) {
        constraints.push(where('destacado', '==', filtros.destacado));
      }

      if (filtros.precoMin) {
        constraints.push(where('preco', '>=', filtros.precoMin));
      }

      if (filtros.precoMax) {
        constraints.push(where('preco', '<=', filtros.precoMax));
      }

      if (filtros.tagEspecial) {
        constraints.push(where('tagsEspeciais', 'array-contains', filtros.tagEspecial));
      }

      // Ordenação
      if (filtros.ordenarPor) {
        constraints.push(orderBy(filtros.ordenarPor, filtros.ordem || 'asc'));
      } else {
        constraints.push(orderBy('dataCriacao', 'desc'));
      }

      // Paginação
      if (filtros.limite) {
        constraints.push(limit(filtros.limite));
      }

      // Executar consulta
      const q = query(produtosQuery, ...constraints);
      const querySnapshot = await getDocs(q);
      
      // Processar resultados
      const produtos: Product[] = [];
      querySnapshot.docs.forEach((doc: any) => {
        produtos.push({ id: doc.id, ...(doc.data() as any) } as Product);
      });

      // Filtro de texto (feito no cliente pois Firestore não suporta busca textual complexa)
      if (filtros.busca) {
        const termoBusca = filtros.busca.toLowerCase();
        return produtos.filter(
          p =>
            p.nome.toLowerCase().includes(termoBusca) ||
            p.descricao.toLowerCase().includes(termoBusca) ||
            p.ingredientes?.some(i => i.toLowerCase().includes(termoBusca))
        );
      }

      return produtos;
    } catch (error: any) {
      loggingService.error('Erro ao listar produtos', { error: error.message, filtros });
      throw error;
    }
  }

  /**
   * Atualiza a disponibilidade de um produto
   * @param id ID do produto
   * @param disponivel Status de disponibilidade
   * @returns Produto atualizado
   */
  public async atualizarDisponibilidade(id: string, disponivel: boolean): Promise<Product> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const atualizacao = {
        disponivel,
        dataAtualizacao: new Date()
      };

      await updateDoc(docRef, atualizacao);
      loggingService.info('Disponibilidade do produto atualizada', { id, disponivel });

      // Buscar produto atualizado
      const docSnapAtualizado = await getDoc(docRef);
      return { id: docSnapAtualizado.id, ...(docSnapAtualizado.data() as any) } as Product;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar disponibilidade do produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Atualiza o preço de um produto
   * @param id ID do produto
   * @param preco Novo preço
   * @returns Produto atualizado
   */
  public async atualizarPreco(id: string, preco: number): Promise<Product> {
    try {
      if (preco <= 0) {
        throw new Error('Preço deve ser maior que zero');
      }

      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const atualizacao = {
        preco,
        dataAtualizacao: new Date()
      };

      await updateDoc(docRef, atualizacao);
      loggingService.info('Preço do produto atualizado', { id, preco });

      // Buscar produto atualizado
      const docSnapAtualizado = await getDoc(docRef);
      return { id: docSnapAtualizado.id, ...(docSnapAtualizado.data() as any) } as Product;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar preço do produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Atualiza o estoque de um produto
   * @param id ID do produto
   * @param quantidade Nova quantidade em estoque
   * @returns Produto atualizado
   */
  public async atualizarEstoque(id: string, quantidade: number): Promise<Product> {
    try {
      if (quantidade < 0) {
        throw new Error('Quantidade não pode ser negativa');
      }

      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const produto = { id: docSnap.id, ...(docSnap.data() as any) } as Product;
      if (!produto.temEstoque) {
        throw new Error('Produto não utiliza controle de estoque');
      }

      const atualizacao: any = {
        estoque: quantidade,
        dataAtualizacao: new Date()
      };

      // Se a quantidade for zero, marcar como indisponível
      if (quantidade === 0) {
        atualizacao.disponivel = false;
      }

      await updateDoc(docRef, atualizacao);
      loggingService.info('Estoque do produto atualizado', { id, quantidade });

      // Buscar produto atualizado
      const docSnapAtualizado = await getDoc(docRef);
      return { id: docSnapAtualizado.id, ...(docSnapAtualizado.data() as any) } as Product;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar estoque do produto', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Adiciona uma avaliação a um produto
   * @param produtoId ID do produto
   * @param clienteId ID do cliente
   * @param clienteNome Nome do cliente
   * @param avaliacao Nota da avaliação (1-5)
   * @param comentario Comentário opcional
   * @returns Produto atualizado
   */
  public async adicionarAvaliacao(
    produtoId: string,
    clienteId: string,
    clienteNome: string,
    avaliacao: number,
    comentario?: string
  ): Promise<Product> {
    try {
      const docRef = doc(db, this.collectionName, produtoId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      if (avaliacao < 1 || avaliacao > 5) {
        throw new Error('Avaliação deve ser entre 1 e 5');
      }

      const produto = { id: docSnap.id, ...(docSnap.data() as any) } as Product;
      const avaliacoes = produto.avaliacoes || [];

      // Verificar se o cliente já avaliou este produto
      const avaliacaoExistente = avaliacoes.findIndex(a => a.clienteId === clienteId);
      const novaAvaliacao = {
        id: avaliacaoExistente >= 0 ? avaliacoes[avaliacaoExistente].id : `aval_${Date.now()}`,
        clienteId,
        clienteNome,
        avaliacao,
        comentario,
        data: new Date()
      };

      // Atualizar ou adicionar avaliação
      if (avaliacaoExistente >= 0) {
        avaliacoes[avaliacaoExistente] = novaAvaliacao;
      } else {
        avaliacoes.push(novaAvaliacao);
      }

      // Atualizar produto no Firestore
      const atualizacao: any = {
        avaliacoes,
        dataAtualizacao: new Date()
      };

      await updateDoc(docRef, atualizacao);
      loggingService.info('Avaliação adicionada ao produto', { produtoId, clienteId });

      // Buscar produto atualizado
      const docSnapAtualizado = await getDoc(docRef);
      return { id: docSnapAtualizado.id, ...(docSnapAtualizado.data() as any) } as Product;
    } catch (error: any) {
      loggingService.error('Erro ao adicionar avaliação ao produto', { produtoId, error: error.message });
      throw error;
    }
  }

  /**
   * Obtém estatísticas dos produtos
   * @returns Estatísticas dos produtos
   */
  public async obterEstatisticas(): Promise<ProductStats> {
    try {
      const produtosRef = collection(db, this.collectionName);
      const querySnapshot = await getDocs(produtosRef);
      
      let total = 0;
      let disponiveis = 0;
      let indisponiveis = 0;
      let destacados = 0;
      let semEstoque = 0;
      let categorias: Record<string, number> = {};
      
      querySnapshot.docs.forEach((doc: any) => {
        const produto = { id: doc.id, ...(doc.data() as any) } as Product;
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

  /**
   * Obtém estatísticas detalhadas de um produto específico
   * @param produtoId ID do produto
   * @returns Estatísticas detalhadas do produto
   */
  public async obterEstatisticasProduto(produtoId: string): Promise<ProductStats> {
    try {
      const docRef = doc(db, this.collectionName, produtoId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const produto = { id: docSnap.id, ...(docSnap.data() as any) } as Product;

      // Dados simulados (em um cenário real seriam buscados de uma coleção de vendas/logs)
      const vendasTotais = Math.floor(Math.random() * 10000);
      const quantidadeVendida = Math.floor(Math.random() * 100);

      // Cálculo da avaliação média
      const avaliacoes = produto.avaliacoes || [];
      const somaAvaliacoes = avaliacoes.reduce((total, av) => total + av.avaliacao, 0);
      const avaliacaoMedia = avaliacoes.length > 0 ? somaAvaliacoes / avaliacoes.length : 0;

      return {
        vendasTotais,
        quantidadeVendida,
        avaliacaoMedia,
        quantidadeAvaliacoes: avaliacoes.length,
      };
    } catch (error: any) {
      loggingService.error('Erro ao obter estatísticas detalhadas do produto', { produtoId, error: error.message });
      throw error;
    }
  }

  public async listarCategorias(): Promise<string[]> {
    try {
      const produtosRef = collection(db, this.collectionName);
      const querySnapshot = await getDocs(produtosRef);
      const categorias = new Set<string>();

      querySnapshot.docs.forEach((doc: any) => {
        const produto = { id: doc.id, ...(doc.data() as any) } as Product;
        if (produto.categoria) {
          categorias.add(produto.categoria);
        }
      });

      return Array.from(categorias);
    } catch (error: any) {
      loggingService.error('Erro ao listar categorias', { error: error.message });
      throw error;
    }
  }

  public async listarProdutosDestacados(): Promise<Product[]> {
    return this.listarProdutos({ destacado: true, disponivel: true });
  }

  public async listarProdutosPromocao(): Promise<Product[]> {
    return this.listarProdutos({ tagEspecial: 'promocao', disponivel: true });
  }

  /**
   * Métodos legados ou duplicados mapeados para as novas implementações
   */

  async getProducts(filters?: ProductFilter): Promise<Product[]> {
    return this.listarProdutos(filters);
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      return await this.consultarProduto(id);
    } catch (error) {
      return null;
    }
  }

  async getFeaturedProducts(limite: number = 10): Promise<Product[]> {
    return this.listarProdutos({ destacado: true, disponivel: true, limite });
  }

  async getProductsByCategory(categoria: string, limite: number = 20): Promise<Product[]> {
    return this.listarProdutos({ categoria, disponivel: true, limite });
  }
}

export const productService = ProductService.getInstance();
