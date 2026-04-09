import { f } from '../../config/firebase';
import { ProductService } from '../ProductService';
const { 
  collection, getDocs, doc, getDoc, query, where, orderBy, limit, setDoc, updateDoc, deleteDoc } = f;

// Unmock ProductService to test the real implementation
jest.unmock('../ProductService');

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

// Mock Firebase Config
jest.mock('../../config/firebase', () => ({
  db: {},
}));

// Mock LoggingService
jest.mock('../LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ProductService', () => {
  let productService: ProductService;
  
  const mockProductData = {
    nome: 'Bolo de Chocolate',
    descricao: 'Bolo de chocolate com cobertura',
    preco: 50,
    categoria: 'bolos',
    disponivel: true,
    imagens: ['bolo-chocolate.jpg'],
    ingredientes: [],
    tagsEspeciais: [],
    alergenos: []
  };

  const mockProduct = {
    id: 'prod_123',
    ...mockProductData,
    dataCriacao: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    productService = ProductService.getInstance();
    
    // Default mocks
    (doc as jest.Mock).mockReturnValue({ id: 'prod_123' });
    (collection as jest.Mock).mockReturnValue({});
  });

  describe('criarProduto', () => {
    it('deve criar um produto com sucesso', async () => {
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      
      const resultado = await productService.criarProduto(mockProductData);
      
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.nome).toBe(mockProductData.nome);
      expect(setDoc).toHaveBeenCalled();
    });

    it('deve rejeitar produto sem nome', async () => {
      const dadosInvalidos = { ...mockProductData, nome: '' };
      await expect(productService.criarProduto(dadosInvalidos)).rejects.toThrow('Nome é obrigatório');
    });

    it('deve rejeitar produto com preço negativo', async () => {
      const dadosInvalidos = { ...mockProductData, preco: -50 };
      await expect(productService.criarProduto(dadosInvalidos)).rejects.toThrow('Preço deve ser maior que zero');
    });

    it('deve rejeitar produto sem categoria', async () => {
      const dadosInvalidos = { ...mockProductData, categoria: '' };
      await expect(productService.criarProduto(dadosInvalidos)).rejects.toThrow('Categoria é obrigatória');
    });
  });

  describe('consultarProduto', () => {
    it('deve consultar um produto existente', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'prod_123',
        data: () => mockProductData,
      });

      const resultado = await productService.consultarProduto('prod_123');
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe('prod_123');
      expect(resultado.nome).toBe(mockProductData.nome);
    });

    it('deve retornar erro para produto inexistente', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await expect(productService.consultarProduto('prod_inexistente')).rejects.toThrow('Produto não encontrado');
    });
  });

  describe('atualizarProduto', () => {
    it('deve atualizar um produto com sucesso', async () => {
      const dadosAtualizacao = {
        nome: 'Bolo de Chocolate Premium',
        preco: 60,
      };

      // Mock getDoc calls: first to check existence, second to return updated data
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'prod_123',
          data: () => mockProductData
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'prod_123',
          data: () => ({ ...mockProductData, ...dadosAtualizacao })
        });
        
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const resultado = await productService.atualizarProduto('prod_123', dadosAtualizacao);
      
      expect(resultado.nome).toBe(dadosAtualizacao.nome);
      expect(resultado.preco).toBe(dadosAtualizacao.preco);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('deve retornar erro ao tentar atualizar produto inexistente', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

      await expect(productService.atualizarProduto('prod_inexistente', { nome: 'Novo' })).rejects.toThrow('Produto não encontrado');
    });

    it('deve rejeitar atualização com preço negativo', async () => {
      await expect(productService.atualizarProduto('prod_123', { preco: -10 })).rejects.toThrow('Preço deve ser maior que zero');
    });
  });

  describe('excluirProduto', () => {
    it('deve excluir um produto com sucesso', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true });
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      const resultado = await productService.excluirProduto('prod_123');
      expect(resultado).toBe(true);
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('deve retornar erro ao tentar excluir produto inexistente', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
      
      await expect(productService.excluirProduto('prod_inexistente')).rejects.toThrow('Produto não encontrado');
    });
  });

  describe('listarProdutos', () => {
    it('deve listar produtos com sucesso', async () => {
      const mockDocs = [
        { id: 'prod_1', data: () => mockProductData },
        { id: 'prod_2', data: () => ({ ...mockProductData, nome: 'Outro Bolo' }) },
      ];
      
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
        forEach: (cb: any) => mockDocs.forEach(cb),
      });

      const resultado = await productService.listarProdutos({});
      expect(resultado).toHaveLength(2);
      expect(getDocs).toHaveBeenCalled();
    });

    it('deve retornar lista vazia quando não há produtos', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        forEach: () => {},
      });

      const filtros = {
        categoria: 'categoria_inexistente',
      };

      const resultado = await productService.listarProdutos(filtros);
      expect(resultado).toHaveLength(0);
      
      // Verify that where clause was used for category
      expect(where).toHaveBeenCalledWith('categoria', '==', 'categoria_inexistente');
    });
  });

  describe('atualizarDisponibilidade', () => {
    it('deve atualizar disponibilidade com sucesso', async () => {
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'prod_123',
          data: () => mockProductData
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'prod_123',
          data: () => ({ ...mockProductData, disponivel: false })
        });
        
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const resultado = await productService.atualizarDisponibilidade('prod_123', false);
      expect(resultado.disponivel).toBe(false);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('deve retornar erro ao tentar atualizar disponibilidade de produto inexistente', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
      
      await expect(productService.atualizarDisponibilidade('prod_inexistente', false)).rejects.toThrow('Produto não encontrado');
    });
  });

  describe('atualizarPreco', () => {
    it('deve atualizar preço com sucesso', async () => {
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'prod_123',
          data: () => mockProductData
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'prod_123',
          data: () => ({ ...mockProductData, preco: 55 })
        });
        
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const resultado = await productService.atualizarPreco('prod_123', 55);
      expect(resultado.preco).toBe(55);
    });

    it('deve retornar erro ao tentar atualizar preço de produto inexistente', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
      
      await expect(productService.atualizarPreco('prod_inexistente', 55)).rejects.toThrow('Produto não encontrado');
    });

    it('deve rejeitar atualização com preço negativo', async () => {
      await expect(productService.atualizarPreco('prod_123', -55)).rejects.toThrow('Preço deve ser maior que zero');
    });
  });
});
