export class ProductService {
  private static instance: ProductService;
  private produtos: Map<string, any>;

  private constructor() {
    this.produtos = new Map();
    this.inicializarDadosTeste();
  }

  private inicializarDadosTeste() {
    // Produto existente
    this.produtos.set('prod_123', {
      id: 'prod_123',
      nome: 'Bolo de Chocolate',
      descricao: 'Bolo de chocolate com cobertura',
      preco: 50,
      categoria: 'bolos',
      disponivel: true,
      imagem: 'bolo-chocolate.jpg',
      dataCriacao: new Date('2024-01-01'),
    });

    // Produto indisponível
    this.produtos.set('prod_456', {
      id: 'prod_456',
      nome: 'Cupcake de Morango',
      descricao: 'Cupcake com cobertura de morango',
      preco: 10,
      categoria: 'cupcakes',
      disponivel: false,
      imagem: 'cupcake-morango.jpg',
      dataCriacao: new Date('2024-01-02'),
    });
  }

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  public async criarProduto(dadosProduto: any): Promise<any> {
    if (!dadosProduto.nome || dadosProduto.nome.trim() === '') {
      throw new Error('Nome é obrigatório');
    }

    if (!dadosProduto.categoria || dadosProduto.categoria.trim() === '') {
      throw new Error('Categoria é obrigatória');
    }

    if (!dadosProduto.preco || dadosProduto.preco <= 0) {
      throw new Error('Preço deve ser maior que zero');
    }

    const produto = {
      id: `prod_${Date.now()}`,
      ...dadosProduto,
      dataCriacao: new Date(),
    };

    this.produtos.set(produto.id, produto);
    return produto;
  }

  public async consultarProduto(idProduto: string): Promise<any> {
    const produto = this.produtos.get(idProduto);
    if (!produto) {
      throw new Error('Produto não encontrado');
    }
    return produto;
  }

  public async atualizarProduto(idProduto: string, dadosAtualizacao: any): Promise<any> {
    const produto = await this.consultarProduto(idProduto);

    if (dadosAtualizacao.preco && dadosAtualizacao.preco <= 0) {
      throw new Error('Preço deve ser maior que zero');
    }

    const produtoAtualizado = {
      ...produto,
      ...dadosAtualizacao,
    };

    this.produtos.set(idProduto, produtoAtualizado);
    return produtoAtualizado;
  }

  public async excluirProduto(idProduto: string): Promise<boolean> {
    const produto = await this.consultarProduto(idProduto);
    this.produtos.delete(idProduto);
    return true;
  }

  public async listarProdutos(filtros?: any): Promise<any[]> {
    let produtos = Array.from(this.produtos.values());

    if (filtros) {
      if (filtros.categoria) {
        produtos = produtos.filter(produto => produto.categoria === filtros.categoria);
      }

      if (filtros.disponivel !== undefined) {
        produtos = produtos.filter(produto => produto.disponivel === filtros.disponivel);
      }

      if (filtros.precoMin !== undefined) {
        produtos = produtos.filter(produto => produto.preco >= filtros.precoMin);
      }

      if (filtros.precoMax !== undefined) {
        produtos = produtos.filter(produto => produto.preco <= filtros.precoMax);
      }
    }

    return produtos;
  }

  public async atualizarDisponibilidade(idProduto: string, disponivel: boolean): Promise<any> {
    const produto = await this.consultarProduto(idProduto);
    produto.disponivel = disponivel;
    this.produtos.set(idProduto, produto);
    return produto;
  }

  public async atualizarPreco(idProduto: string, novoPreco: number): Promise<any> {
    if (novoPreco <= 0) {
      throw new Error('Preço deve ser maior que zero');
    }

    const produto = await this.consultarProduto(idProduto);
    produto.preco = novoPreco;
    this.produtos.set(idProduto, produto);
    return produto;
  }
}
