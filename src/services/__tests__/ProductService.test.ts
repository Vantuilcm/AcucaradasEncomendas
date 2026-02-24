import { ProductService } from '../ProductService';

describe('ProductService', () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = ProductService.getInstance();
  });

  describe('criarProduto', () => {
    it('deve criar um produto com sucesso', async () => {
      const dadosProduto = {
        nome: 'Bolo de Chocolate',
        descricao: 'Bolo de chocolate com cobertura',
        preco: 50,
        categoria: 'bolos',
        disponivel: true,
        imagem: 'bolo-chocolate.jpg',
      };

      const resultado = await productService.criarProduto(dadosProduto);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.nome).toBe(dadosProduto.nome);
      expect(resultado.descricao).toBe(dadosProduto.descricao);
      expect(resultado.preco).toBe(dadosProduto.preco);
      expect(resultado.categoria).toBe(dadosProduto.categoria);
      expect(resultado.disponivel).toBe(dadosProduto.disponivel);
      expect(resultado.imagem).toBe(dadosProduto.imagem);
    });

    it('deve rejeitar produto sem nome', async () => {
      const dadosProduto = {
        descricao: 'Bolo de chocolate com cobertura',
        preco: 50,
        categoria: 'bolos',
        disponivel: true,
        imagem: 'bolo-chocolate.jpg',
      };

      await expect(productService.criarProduto(dadosProduto)).rejects.toThrow('Nome é obrigatório');
    });

    it('deve rejeitar produto com preço negativo', async () => {
      const dadosProduto = {
        nome: 'Bolo de Chocolate',
        descricao: 'Bolo de chocolate com cobertura',
        preco: -50,
        categoria: 'bolos',
        disponivel: true,
        imagem: 'bolo-chocolate.jpg',
      };

      await expect(productService.criarProduto(dadosProduto)).rejects.toThrow(
        'Preço deve ser maior que zero'
      );
    });

    it('deve rejeitar produto sem categoria', async () => {
      const dadosProduto = {
        nome: 'Bolo de Chocolate',
        descricao: 'Bolo de chocolate com cobertura',
        preco: 50,
        disponivel: true,
        imagem: 'bolo-chocolate.jpg',
      };

      await expect(productService.criarProduto(dadosProduto)).rejects.toThrow(
        'Categoria é obrigatória'
      );
    });
  });

  describe('consultarProduto', () => {
    it('deve consultar um produto existente', async () => {
      const idProduto = 'prod_123';
      const resultado = await productService.consultarProduto(idProduto);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idProduto);
      expect(resultado.nome).toBe('Bolo de Chocolate');
      expect(resultado.preco).toBe(50);
    });

    it('deve retornar erro para produto inexistente', async () => {
      const idProduto = 'prod_inexistente';
      await expect(productService.consultarProduto(idProduto)).rejects.toThrow(
        'Produto não encontrado'
      );
    });
  });

  describe('atualizarProduto', () => {
    it('deve atualizar um produto com sucesso', async () => {
      const idProduto = 'prod_123';
      const dadosAtualizacao = {
        nome: 'Bolo de Chocolate Premium',
        descricao: 'Bolo de chocolate com cobertura premium',
        preco: 60,
        categoria: 'bolos',
        disponivel: true,
        imagem: 'bolo-chocolate-premium.jpg',
      };

      const resultado = await productService.atualizarProduto(idProduto, dadosAtualizacao);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idProduto);
      expect(resultado.nome).toBe(dadosAtualizacao.nome);
      expect(resultado.descricao).toBe(dadosAtualizacao.descricao);
      expect(resultado.preco).toBe(dadosAtualizacao.preco);
      expect(resultado.imagem).toBe(dadosAtualizacao.imagem);
    });

    it('deve retornar erro ao tentar atualizar produto inexistente', async () => {
      const idProduto = 'prod_inexistente';
      const dadosAtualizacao = {
        nome: 'Bolo de Chocolate Premium',
        descricao: 'Bolo de chocolate com cobertura premium',
        preco: 60,
        categoria: 'bolos',
        disponivel: true,
        imagem: 'bolo-chocolate-premium.jpg',
      };

      await expect(productService.atualizarProduto(idProduto, dadosAtualizacao)).rejects.toThrow(
        'Produto não encontrado'
      );
    });

    it('deve rejeitar atualização com preço negativo', async () => {
      const idProduto = 'prod_123';
      const dadosAtualizacao = {
        nome: 'Bolo de Chocolate Premium',
        descricao: 'Bolo de chocolate com cobertura premium',
        preco: -60,
        categoria: 'bolos',
        disponivel: true,
        imagem: 'bolo-chocolate-premium.jpg',
      };

      await expect(productService.atualizarProduto(idProduto, dadosAtualizacao)).rejects.toThrow(
        'Preço deve ser maior que zero'
      );
    });
  });

  describe('excluirProduto', () => {
    it('deve excluir um produto com sucesso', async () => {
      const idProduto = 'prod_123';
      const resultado = await productService.excluirProduto(idProduto);
      expect(resultado).toBe(true);
    });

    it('deve retornar erro ao tentar excluir produto inexistente', async () => {
      const idProduto = 'prod_inexistente';
      await expect(productService.excluirProduto(idProduto)).rejects.toThrow(
        'Produto não encontrado'
      );
    });
  });

  describe('listarProdutos', () => {
    it('deve listar produtos com sucesso', async () => {
      const filtros = {
        categoria: 'bolos',
        disponivel: true,
        precoMin: 0,
        precoMax: 100,
      };

      const resultado = await productService.listarProdutos(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('deve retornar lista vazia quando não há produtos', async () => {
      const filtros = {
        categoria: 'categoria_inexistente',
        disponivel: true,
        precoMin: 0,
        precoMax: 100,
      };

      const resultado = await productService.listarProdutos(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBe(0);
    });
  });

  describe('atualizarDisponibilidade', () => {
    it('deve atualizar disponibilidade com sucesso', async () => {
      const idProduto = 'prod_123';
      const disponivel = false;
      const resultado = await productService.atualizarDisponibilidade(idProduto, disponivel);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idProduto);
      expect(resultado.disponivel).toBe(disponivel);
    });

    it('deve retornar erro ao tentar atualizar disponibilidade de produto inexistente', async () => {
      const idProduto = 'prod_inexistente';
      const disponivel = false;
      await expect(productService.atualizarDisponibilidade(idProduto, disponivel)).rejects.toThrow(
        'Produto não encontrado'
      );
    });
  });

  describe('atualizarPreco', () => {
    it('deve atualizar preço com sucesso', async () => {
      const idProduto = 'prod_123';
      const novoPreco = 55;
      const resultado = await productService.atualizarPreco(idProduto, novoPreco);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idProduto);
      expect(resultado.preco).toBe(novoPreco);
    });

    it('deve retornar erro ao tentar atualizar preço de produto inexistente', async () => {
      const idProduto = 'prod_inexistente';
      const novoPreco = 55;
      await expect(productService.atualizarPreco(idProduto, novoPreco)).rejects.toThrow(
        'Produto não encontrado'
      );
    });

    it('deve rejeitar atualização com preço negativo', async () => {
      const idProduto = 'prod_123';
      const novoPreco = -55;
      await expect(productService.atualizarPreco(idProduto, novoPreco)).rejects.toThrow(
        'Preço deve ser maior que zero'
      );
    });
  });
});
