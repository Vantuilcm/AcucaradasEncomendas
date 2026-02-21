import { Product, ProductFilter, ProductStats, ProductCategories } from '../types/Product';
import { loggingService } from './LoggingService';
import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export class ProductService {
  private readonly collectionName = 'products';

  constructor() {
    // Inicialização do serviço
    loggingService.info('ProductService inicializado');
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
      await setDoc(docRef, novoProduto);
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

      return docSnap.data() as Product;
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
      const produtoAtual = docSnap.data() as Product;
      const produtoAtualizado: Partial<Product> = {
        ...dados,
        dataAtualizacao: new Date()
      };

      // Atualizar no Firestore
      await updateDoc(docRef, produtoAtualizado);
      
      // Buscar produto atualizado
      const docSnapAtualizado = await getDoc(docRef);
      loggingService.info('Produto atualizado com sucesso', { id });
      
      return docSnapAtualizado.data() as Product;
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
      querySnapshot.forEach((doc) => {
        produtos.push(doc.data() as Product);
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
      return docSnapAtualizado.data() as Product;
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
      return docSnapAtualizado.data() as Product;
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

      const produto = docSnap.data() as Product;
      if (!produto.temEstoque) {
        throw new Error('Produto não utiliza controle de estoque');
      }

      const atualizacao: Partial<Product> = {
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
      return docSnapAtualizado.data() as Product;
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

      const produto = docSnap.data() as Product;
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
      const atualizacao = {
        avaliacoes,
        dataAtualizacao: new Date()
      };

      await updateDoc(docRef, atualizacao);
      loggingService.info('Avaliação adicionada ao produto', { produtoId, clienteId });

      // Buscar produto atualizado
      const docSnapAtualizado = await getDoc(docRef);
      return docSnapAtualizado.data() as Product;
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
      
      querySnapshot.forEach((doc) => {
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

    if (!produto.avaliacoes) {
      produto.avaliacoes = [];
    }

    const novaAvaliacao = {
      id: `review_${Date.now()}`,
      clienteId,
      clienteNome,
      avaliacao,
      comentario,
      data: new Date(),
    };

    produto.avaliacoes.push(novaAvaliacao);
    produto.dataAtualizacao = new Date();

    this.produtos.set(produtoId, produto);
    return produto;
  }

  public async obterEstatisticasProduto(produtoId: string): Promise<ProductStats> {
    const produto = this.produtos.get(produtoId);
    if (!produto) {
      throw new Error('Produto não encontrado');
    }

    // Dados simulados
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
  }

  public async listarCategorias(): Promise<string[]> {
    const categorias = new Set<string>();

    this.produtos.forEach(produto => {
      categorias.add(produto.categoria);
    });

    return Array.from(categorias);
  }

  public async listarProdutosDestacados(): Promise<Product[]> {
    return Array.from(this.produtos.values()).filter(p => p.destacado && p.disponivel);
  }

  public async listarProdutosPromocao(): Promise<Product[]> {
    return Array.from(this.produtos.values()).filter(
      p => p.tagsEspeciais?.includes('promocao') && p.disponivel
    );
  }

  async getProducts(filters?: ProductFilter): Promise<Product[]> {
    try {
      // Se estamos em modo de desenvolvimento ou teste, fornecemos dados de mock
      if (__DEV__ || process.env.NODE_ENV === 'test') {
        return this.getMockProducts();
      }

      let productQuery = collection(db, this.collection);
      let queryConstraints = [];

      // Aplicar filtros se fornecidos
      if (filters) {
        if (filters.categoria) {
          queryConstraints.push(where('categoria', '==', filters.categoria));
        }

        if (filters.disponivel !== undefined) {
          queryConstraints.push(where('disponivel', '==', filters.disponivel));
        }

        if (filters.destacado !== undefined) {
          queryConstraints.push(where('destacado', '==', filters.destacado));
        }

        if (filters.precoMin !== undefined) {
          queryConstraints.push(where('preco', '>=', filters.precoMin));
        }

        if (filters.precoMax !== undefined) {
          queryConstraints.push(where('preco', '<=', filters.precoMax));
        }

        if (filters.tagEspecial) {
          queryConstraints.push(where('tagsEspeciais', 'array-contains', filters.tagEspecial));
        }
      }

      // Adicionar ordenação por destacado (primeiro) e depois por data de criação (mais recentes)
      queryConstraints.push(orderBy('destacado', 'desc'));
      queryConstraints.push(orderBy('dataCriacao', 'desc'));

      const q = query(productQuery, ...queryConstraints);
      const snapshot = await getDocs(q);

      const products: Product[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        products.push({
          id: doc.id,
          ...data,
          dataCriacao: data.dataCriacao?.toDate() || new Date(),
          dataAtualizacao: data.dataAtualizacao?.toDate() || undefined,
        } as Product);
      });

      // Se há uma busca textual, filtrar os resultados localmente
      if (filters?.busca) {
        const searchTerm = filters.busca.toLowerCase();
        return products.filter(
          product =>
            product.nome.toLowerCase().includes(searchTerm) ||
            product.descricao.toLowerCase().includes(searchTerm)
        );
      }

      return products;
    } catch (error) {
      loggingService.error('Erro ao buscar produtos', { error });
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      // Se estamos em modo de desenvolvimento ou teste, fornecemos dados de mock
      if (__DEV__ || process.env.NODE_ENV === 'test') {
        const mockProducts = this.getMockProducts();
        return mockProducts.find(p => p.id === id) || null;
      }

      const productRef = doc(db, this.collection, id);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return null;
      }

      const data = productSnap.data();
      return {
        id: productSnap.id,
        ...data,
        dataCriacao: data.dataCriacao?.toDate() || new Date(),
        dataAtualizacao: data.dataAtualizacao?.toDate() || undefined,
      } as Product;
    } catch (error) {
      loggingService.error('Erro ao buscar produto por ID', { error, productId: id });
      throw error;
    }
  }

  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    try {
      // Se estamos em modo de desenvolvimento ou teste, fornecemos dados de mock
      if (__DEV__ || process.env.NODE_ENV === 'test') {
        const mockProducts = this.getMockProducts();
        return mockProducts.filter(p => p.destacado).slice(0, limit);
      }

      const q = query(
        collection(db, this.collection),
        where('destacado', '==', true),
        where('disponivel', '==', true),
        orderBy('dataCriacao', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);

      const products: Product[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        products.push({
          id: doc.id,
          ...data,
          dataCriacao: data.dataCriacao?.toDate() || new Date(),
          dataAtualizacao: data.dataAtualizacao?.toDate() || undefined,
        } as Product);
      });

      return products;
    } catch (error) {
      loggingService.error('Erro ao buscar produtos em destaque', { error });
      throw error;
    }
  }

  async getProductsByCategory(category: string, limit: number = 20): Promise<Product[]> {
    try {
      // Se estamos em modo de desenvolvimento ou teste, fornecemos dados de mock
      if (__DEV__ || process.env.NODE_ENV === 'test') {
        const mockProducts = this.getMockProducts();
        return mockProducts.filter(p => p.categoria === category && p.disponivel).slice(0, limit);
      }

      const q = query(
        collection(db, this.collection),
        where('categoria', '==', category),
        where('disponivel', '==', true),
        orderBy('dataCriacao', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);

      const products: Product[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        products.push({
          id: doc.id,
          ...data,
          dataCriacao: data.dataCriacao?.toDate() || new Date(),
          dataAtualizacao: data.dataAtualizacao?.toDate() || undefined,
        } as Product);
      });

      return products;
    } catch (error) {
      loggingService.error('Erro ao buscar produtos por categoria', { error, category });
      throw error;
    }
  }

  private getMockProducts(): Product[] {
    return [
      {
        id: '1',
        nome: 'Bolo de Chocolate',
        descricao: 'Delicioso bolo de chocolate com cobertura de brigadeiro e granulado.',
        preco: 45.9,
        categoria: 'Bolos',
        disponivel: true,
        imagens: ['https://via.placeholder.com/400x300/FF69B4/FFFFFF?text=Bolo+de+Chocolate'],
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
        id: '2',
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
        id: '3',
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
        id: '4',
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
        id: '5',
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
        id: '6',
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
