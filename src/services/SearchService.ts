import { Product } from '../types/Product';
import { ProductService } from './ProductService';
import { loggingService } from './LoggingService';
import { SearchMonitoring, MetricType } from '../monitoring/SearchMonitoring';
import { webSocketManager } from '../monitoring/WebSocketManager';

/**
 * Interface para o sistema de busca avançada
 */
interface IBuscaAvancada {
  indexarProduto: (produto: any) => void;
  indexarProdutos: (produtos: any[]) => void;
  buscar: (consulta: string, opcoes?: any) => any;
  removerProduto: (id: string) => void;
  atualizarProduto: (produto: any) => void;
  reindexarTudo: () => void;
  obterEstatisticas: () => any;
}

/**
 * Serviço de busca avançada que integra o SistemaBuscaAvancada com a aplicação React Native
 */
export class SearchService {
  private static instance: SearchService;
  private sistemaBusca: IBuscaAvancada | null = null;
  private productService: ProductService;
  private indexado: boolean = false;
  private monitoring: SearchMonitoring;

  private constructor() {
    this.productService = ProductService.getInstance();
    this.monitoring = SearchMonitoring.getInstance();
    this.inicializarSistemaBusca();
  }

  /**
   * Gera sugestões inteligentes para quando uma busca não retorna resultados
   */
  private async gerarSugestoesBuscaVazia(termo: string): Promise<string[]> {
    try {
      // 1. Sugestões baseadas em categorias populares
      const categorias = ['Bolos', 'Doces Finos', 'Pães Artitais', 'Salgados'];
      
      // 2. Sugestões baseadas em termos comuns (ex: promoções)
      const termosComuns = ['promoção', 'novidades', 'mais vendidos'];
      
      // 3. Lógica de fallback: retornar uma mistura de categorias e termos
      return [...termosComuns, ...categorias].slice(0, 5);
    } catch (error) {
      return ['bolos', 'doces', 'salgados'];
    }
  }

  /**
   * Obtém a instância única do SearchService (Singleton)
   */
  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Inicializa o sistema de busca avançada
   */
  private async inicializarSistemaBusca(): Promise<void> {
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).SistemaBuscaAvancada) {
        this.sistemaBusca = new (globalThis as any).SistemaBuscaAvancada();
        await this.indexarProdutos();
        return;
      }
      let modulo: any = null;
      try {
        modulo = require('../../js/busca-avancada');
      } catch {}
      if (!modulo) {
        try {
          modulo = require('../js/busca-avancada');
        } catch {}
      }
      if (!modulo) {
        try {
          modulo = require('./busca-avancada');
        } catch {}
      }
      if (modulo && (modulo as any).SistemaBuscaAvancada) {
        this.sistemaBusca = new (modulo as any).SistemaBuscaAvancada();
        await this.indexarProdutos();
      }
    } catch (error) {
      loggingService.error('Erro ao inicializar sistema de busca avançada', { error });
    }
  }

  /**
   * Indexa todos os produtos no sistema de busca
   */
  private async indexarProdutos(): Promise<void> {
    if (!this.sistemaBusca || this.indexado) return;

    try {
      const produtos = await this.productService.listarProdutos({});

      // Adaptar produtos para o formato esperado pelo sistema de busca
      const produtosAdaptados = produtos.map(produto => ({
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao,
        categoria: produto.categoria,
        tags: produto.tagsEspeciais || [],
        ingredientes: produto.ingredientes || [],preco: produto.preco,
        disponivel: produto.disponivel,
      }));

      this.sistemaBusca.indexarProdutos(produtosAdaptados);
      this.indexado = true;
      loggingService.info('Produtos indexados com sucesso', { count: produtos.length });
    } catch (error) {
      loggingService.error('Erro ao indexar produtos', { error });
    }
  }

  /**
   * Atualiza a indexação de um produto específico
   */
  public async atualizarIndexacaoProduto(produto: Product): Promise<void> {
    if (!this.sistemaBusca) return;

    try {
      const produtoAdaptado = {
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao,
        categoria: produto.categoria,
        tags: produto.tagsEspeciais || [],
        ingredientes: produto.ingredientes || [],preco: produto.preco,
        disponivel: produto.disponivel,
      };

      this.sistemaBusca.atualizarProduto(produtoAdaptado);
      try {
        const cache = (await import('./cacheService')).default as any;
        await cache.removeByPrefix('advanced_search:');
      } catch {}
    } catch (error) {
      loggingService.error('Erro ao atualizar indexação do produto', {
        error,
        productId: produto.id,
      });
    }
  }

  /**
   * Remove um produto da indexação
   */
  public async removerProdutoDeIndexacao(id: string): Promise<void> {
    if (!this.sistemaBusca) return;

    try {
      this.sistemaBusca.removerProduto(id);
      try {
        const cache = (await import('./cacheService')).default as any;
        await cache.removeByPrefix('advanced_search:');
      } catch {}
    } catch (error) {
      loggingService.error('Erro ao remover produto da indexação', { error, productId: id });
    }
  }

  /**
   * Realiza uma busca avançada de produtos
   * @param termo Termo de busca
   * @param filtros Filtros a serem aplicados (categoria, preço, etc)
   * @param ordenacao Ordenação dos resultados
   * @param pagina Número da página
   * @param itensPorPagina Itens por página
   */
  public async buscarProdutos(
    termo: string,
    filtros: {
      categoria?: string;
      precoMin?: number;
      precoMax?: number;
      tagEspecial?: string;
      disponivel?: boolean;
    } = {},
    ordenacao?: { campo: string; direcao: 'asc' | 'desc' },
    pagina: number = 1,
    itensPorPagina: number = 12
  ): Promise<{ produtos: Product[]; total: number; paginas: number; sugestoes: string[] }> {
    const startTime = Date.now();
    const searchContext = {
      termo,
      filtros,
      ordenacao,
      pagina,
      itensPorPagina,
      algoritmo: this.sistemaBusca ? 'avancado' : 'simples',
    };
    try {
      // Se o sistema de busca avançada estiver disponível, usá-lo
      if (this.sistemaBusca) {
        try {
          // Garantir que os produtos estejam indexados
          if (!this.indexado) {
            await this.indexarProdutos();
          }

          // Adaptar filtros para o formato do sistema de busca
          const opcoesBusca: any = {
            filtros: {},
            pagina,
            resultadosPorPagina: itensPorPagina,
          };

          // Adicionar filtros
          if (filtros.categoria) opcoesBusca.filtros.categoria = filtros.categoria;
          if (filtros.disponivel !== undefined) opcoesBusca.filtros.disponivel = filtros.disponivel;
          if (filtros.precoMin !== undefined || filtros.precoMax !== undefined) {
            opcoesBusca.filtros.preco = {};
            if (filtros.precoMin !== undefined) opcoesBusca.filtros.preco.min = filtros.precoMin;
            if (filtros.precoMax !== undefined) opcoesBusca.filtros.preco.max = filtros.precoMax;
          }
          if (filtros.tagEspecial) opcoesBusca.filtros.tags = [filtros.tagEspecial];

          // Adicionar ordenação
          if (ordenacao) {
            opcoesBusca.ordenacao = {
              campo: ordenacao.campo,
              direcao: ordenacao.direcao,
            };
          }

          // Gravar métrica de tempo de execução e resultado
          const resultado = await this.monitoring.measureExecutionTime<{ resultados: Product[]; total: number; totalPaginas: number; sugestoes?: string[] }>(
            MetricType.SEARCH_LATENCY,
            () => Promise.resolve(this.sistemaBusca!.buscar(termo, opcoesBusca)),
            searchContext
          );

          // Monitorar tendências de busca
          this.monitoring.recordSearchTrend(termo, Date.now() - startTime, resultado.total > 0);

          // Refinamento UX: Se não houver resultados, gerar sugestões baseadas em tendências ou categorias
          if (resultado.total === 0) {
            this.monitoring.recordZeroResults(termo, searchContext);
            
            // Sugestões inteligentes (ex: produtos populares, categorias comuns)
            // @ts-ignore - Método a ser implementado
            resultado.sugestoes = await (this as any).gerarSugestoesBuscaVazia(termo);
          }

          this.monitoring.recordMemoryUsage();

          const response = {
            produtos: resultado.resultados,
            total: resultado.total,
            paginas: resultado.totalPaginas,
            sugestoes: resultado.sugestoes || [],
          };

          // Transmitir dados em tempo real
          webSocketManager.broadcastToSubscribers(
            {
              type: 'search_completed',
              data: {
                termo,
                resultados: resultado.total,
                latencia: Date.now() - startTime,
                algoritmo: 'avancado',
              },
              timestamp: Date.now(),
            },
            'search_trends'
          );

          return response;
        } catch (error) {
          // Registrar erro no monitoramento
          const errMsgAdv = (error instanceof Error ? error.message : String(error));
this.monitoring.recordMetric(MetricType.ERROR_RATE, 1, { error: errMsgAdv, algoritmo: 'avancado', termo });

          loggingService.error('Erro ao realizar busca avançada', { error, termo });
          // Em caso de erro, cair para a busca simples
        }
      }

      // Fallback: usar a busca simples do ProductService
      const produtos = await this.monitoring.measureExecutionTime<Product[]>(
  MetricType.SEARCH_LATENCY,
  () => this.productService.listarProdutos({
    busca: termo,
    categoria: filtros.categoria,
    precoMin: filtros.precoMin,
    precoMax: filtros.precoMax,
    tagEspecial: filtros.tagEspecial,
    disponivel: filtros.disponivel,
  }),
  { ...searchContext, algoritmo: 'simples' }
);

      // Aplicar ordenação manualmente se necessário
      let produtosOrdenados = [...produtos];
      if (ordenacao) {
        produtosOrdenados.sort((a, b) => {
          const valorA = a[ordenacao.campo as keyof Product];
          const valorB = b[ordenacao.campo as keyof Product];

          if (typeof valorA === 'number' && typeof valorB === 'number') {
            return ordenacao.direcao === 'asc' ? valorA - valorB : valorB - valorA;
          }

          if (typeof valorA === 'string' && typeof valorB === 'string') {
            return ordenacao.direcao === 'asc'
              ? valorA.localeCompare(valorB)
              : valorB.localeCompare(valorA);
          }

          return 0;
        });
      }

      // Aplicar paginação manualmente
      const inicio = (pagina - 1) * itensPorPagina;
      const fim = inicio + itensPorPagina;
      const produtosPaginados = produtosOrdenados.slice(inicio, fim);
      const totalPaginas = Math.ceil(produtosOrdenados.length / itensPorPagina);

      // Registrar tendência de busca
      this.monitoring.recordSearchTrend(
        termo,
        Date.now() - startTime,
        produtosOrdenados.length > 0
      );

      // Verificar se houve resultados
      if (produtosOrdenados.length === 0) {
        this.monitoring.recordZeroResults(termo, { ...searchContext, algoritmo: 'simples' });
      }

      // Registrar uso de memória
      this.monitoring.recordMemoryUsage();

      const response = {
        produtos: produtosPaginados,
        total: produtosOrdenados.length,
        paginas: totalPaginas,
        sugestoes: [], // Busca simples não gera sugestões
      };

      // Transmitir dados em tempo real
      webSocketManager.broadcastToSubscribers(
        {
          type: 'search_completed',
          data: {
            termo,
            resultados: produtosOrdenados.length,
            latencia: Date.now() - startTime,
            algoritmo: 'simples',
          },
          timestamp: Date.now(),
        },
        'search_trends'
      );

      return response;
    } catch (error) {
      // Registrar erro no monitoramento
      const errMsg = (error instanceof Error ? error.message : String(error));
this.monitoring.recordMetric(MetricType.ERROR_RATE, 1, { error: errMsg, algoritmo: searchContext.algoritmo, termo });

      loggingService.error('Erro ao realizar busca de produtos', { error, termo });
      throw error;
    }
  }

  /**
   * Obtém estatísticas do sistema de busca
   */
  public obterEstatisticas(): any {
    if (!this.sistemaBusca) {
      return {
        disponivel: false,
        mensagem: 'Sistema de busca avançada não disponível',
      };
    }

    try {
      const estatisticas = this.sistemaBusca.obterEstatisticas();
      return {
        disponivel: true,
        ...estatisticas,
      };
    } catch (error) {
      loggingService.error('Erro ao obter estatísticas do sistema de busca', { error });
      return {
        disponivel: true,
        erro: 'Não foi possível obter estatísticas',
      };
    }
  }
}



