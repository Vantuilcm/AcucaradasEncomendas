/**
 * Sistema de Busca Avançada com Indexação e Relevância
 *
 * Este algoritmo implementa um sistema de busca que utiliza técnicas de processamento
 * de linguagem natural para melhorar a relevância dos resultados, incluindo indexação,
 * cálculo de relevância, filtragem e ordenação inteligente.
 *
 * Complexidade Temporal:
 * - Indexação: O(n*m) onde n é o número de produtos e m é o número médio de termos por produto
 * - Busca: O(k + r log r) onde k é o número de produtos que correspondem aos termos de busca
 *   e r é o número de resultados após filtragem
 *
 * Complexidade Espacial: O(n*m) para armazenar o índice invertido e metadados
 */

class SistemaBuscaAvancada {
  constructor(opcoes = {}) {
    // Configurações padrão
    this.configuracoes = {
      // Campos a serem indexados e seus pesos de relevância
      camposIndexados: {
        nome: 10.0, // Nome do produto tem peso maior
        descricao: 5.0, // Descrição tem peso médio
        categoria: 8.0, // Categoria tem peso alto
        tags: 7.0, // Tags têm peso alto
        ingredientes: 6.0, // Ingredientes têm peso médio-alto
        sabor: 7.0, // Sabor tem peso alto
        ocasiao: 4.0, // Ocasião tem peso médio-baixo
      },

      // Configurações de normalização de texto
      normalizacao: {
        removerAcentos: true,
        converterParaMinusculas: true,
        removerStopwords: true,
        aplicarStemming: true,
      },

      // Configurações de cache
      cache: {
        ativar: true,
        tamanhoMaximo: 100, // Número máximo de consultas em cache
        tempoExpiracao: 3600, // Tempo de expiração em segundos (1 hora)
      },

      // Configurações de paginação
      paginacao: {
        resultadosPorPagina: 12,
      },

      // Configurações de sugestões
      sugestoes: {
        ativar: true,
        maxSugestoes: 5,
        distanciaMaxima: 2, // Distância de Levenshtein máxima para sugestões
      },
    };

    // Sobrescrever configurações padrão com as fornecidas
    this.configuracoes = { ...this.configuracoes, ...opcoes };

    // Inicializar estruturas de dados
    this.indice = {}; // Índice invertido: termo -> [documentos]
    this.documentos = {}; // Armazenamento de documentos: id -> documento
    this.idf = {}; // Valores IDF (Inverse Document Frequency) para cada termo
    this.totalDocumentos = 0; // Contador de documentos indexados
    this.cacheConsultas = new Map(); // Cache de consultas recentes
    this.timestampCache = new Map(); // Timestamps para expiração de cache

    // Lista de stopwords em português
    this.stopwords = new Set([
      'a',
      'ao',
      'aos',
      'aquela',
      'aquelas',
      'aquele',
      'aqueles',
      'aquilo',
      'as',
      'até',
      'com',
      'como',
      'da',
      'das',
      'de',
      'dela',
      'delas',
      'dele',
      'deles',
      'depois',
      'do',
      'dos',
      'e',
      'ela',
      'elas',
      'ele',
      'eles',
      'em',
      'entre',
      'era',
      'eram',
      'éramos',
      'essa',
      'essas',
      'esse',
      'esses',
      'esta',
      'estas',
      'este',
      'estes',
      'eu',
      'foi',
      'fomos',
      'for',
      'foram',
      'fosse',
      'fossem',
      'há',
      'isso',
      'isto',
      'já',
      'lhe',
      'lhes',
      'mais',
      'mas',
      'me',
      'mesmo',
      'meu',
      'meus',
      'minha',
      'minhas',
      'muito',
      'muitos',
      'na',
      'não',
      'nas',
      'nem',
      'no',
      'nos',
      'nós',
      'nossa',
      'nossas',
      'nosso',
      'nossos',
      'num',
      'numa',
      'o',
      'os',
      'ou',
      'para',
      'pela',
      'pelas',
      'pelo',
      'pelos',
      'por',
      'qual',
      'quando',
      'que',
      'quem',
      'são',
      'se',
      'seja',
      'sejam',
      'sem',
      'seu',
      'seus',
      'só',
      'somos',
      'sua',
      'suas',
      'também',
      'te',
      'tem',
      'tém',
      'temos',
      'tenho',
      'teu',
      'teus',
      'tu',
      'tua',
      'tuas',
      'um',
      'uma',
      'você',
      'vocês',
      'vos',
      'vosso',
      'vossos',
    ]);
  }

  /**
   * Normaliza o texto para indexação ou busca
   * @param {string} texto - Texto a ser normalizado
   * @returns {string[]} - Array de termos normalizados
   */
  normalizarTexto(texto) {
    if (!texto || typeof texto !== 'string') return [];

    let resultado = texto;

    // Converter para minúsculas
    if (this.configuracoes.normalizacao.converterParaMinusculas) {
      resultado = resultado.toLowerCase();
    }

    // Remover acentos
    if (this.configuracoes.normalizacao.removerAcentos) {
      resultado = resultado.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // Dividir em termos e filtrar
    let termos = resultado
      .replace(/[^\w\s]/g, ' ') // Substituir pontuação por espaços
      .split(/\s+/) // Dividir por espaços
      .filter(termo => termo.length > 1); // Remover termos muito curtos

    // Remover stopwords
    if (this.configuracoes.normalizacao.removerStopwords) {
      termos = termos.filter(termo => !this.stopwords.has(termo));
    }

    // Aplicar stemming (simplificado para português)
    if (this.configuracoes.normalizacao.aplicarStemming) {
      termos = termos.map(termo => this.aplicarStemming(termo));
    }

    return termos;
  }

  /**
   * Aplica stemming simplificado para português
   * @param {string} termo - Termo para aplicar stemming
   * @returns {string} - Termo após stemming
   */
  aplicarStemming(termo) {
    // Implementação simplificada de stemming para português
    // Remove sufixos comuns
    const sufixos = [
      'inho',
      'inha',
      'inhos',
      'inhas',
      'zinho',
      'zinha',
      'zinhos',
      'zinhas',
      'mente',
      'mento',
      'mentos',
      'acao',
      'acoes',
      'ação',
      'ações',
      'dade',
      'dades',
      'idade',
      'idades',
      'ismo',
      'ismos',
      'ista',
      'istas',
      'avel',
      'aveis',
      'ível',
      'íveis',
      'oso',
      'osa',
      'osos',
      'osas',
      'ador',
      'adora',
      'adores',
      'adoras',
      'ante',
      'antes',
      'ancia',
      'ância',
      'ancias',
      'âncias',
      'encia',
      'ência',
      'encias',
      'ências',
      'eza',
      'ezas',
      'ico',
      'ica',
      'icos',
      'icas',
      'aria',
      'arias',
      'ar',
      'er',
      'ir',
      'ando',
      'endo',
      'indo',
      'ado',
      'ada',
      'ados',
      'adas',
      'ido',
      'ida',
      'idos',
      'idas',
    ];

    for (const sufixo of sufixos) {
      if (termo.length > sufixo.length + 3 && termo.endsWith(sufixo)) {
        return termo.slice(0, -sufixo.length);
      }
    }

    return termo;
  }

  /**
   * Indexa um produto no sistema de busca
   * @param {Object} produto - Produto a ser indexado
   */
  indexarProduto(produto) {
    if (!produto || !produto.id) return;

    // Armazenar o documento
    this.documentos[produto.id] = produto;
    this.totalDocumentos++;

    // Para cada campo indexável
    for (const [campo, peso] of Object.entries(this.configuracoes.camposIndexados)) {
      if (!produto[campo]) continue;

      let valorCampo = produto[campo];

      // Tratar arrays (como tags, ingredientes)
      if (Array.isArray(valorCampo)) {
        valorCampo = valorCampo.join(' ');
      }

      // Normalizar o texto do campo
      const termos = this.normalizarTexto(valorCampo);

      // Calcular frequência de termos neste documento
      const termFreq = {};
      termos.forEach(termo => {
        termFreq[termo] = (termFreq[termo] || 0) + 1;
      });

      // Adicionar ao índice invertido
      for (const [termo, frequencia] of Object.entries(termFreq)) {
        if (!this.indice[termo]) {
          this.indice[termo] = [];
        }

        // Armazenar ID do documento, campo, frequência e peso
        this.indice[termo].push({
          id: produto.id,
          campo,
          freq: frequencia,
          peso,
        });
      }
    }

    // Recalcular IDF para todos os termos
    this.calcularIDF();
  }

  /**
   * Indexa múltiplos produtos de uma vez
   * @param {Array} produtos - Array de produtos a serem indexados
   */
  indexarProdutos(produtos) {
    if (!Array.isArray(produtos)) return;

    produtos.forEach(produto => this.indexarProduto(produto));
  }

  /**
   * Calcula os valores IDF (Inverse Document Frequency) para todos os termos
   */
  calcularIDF() {
    for (const termo in this.indice) {
      // Conjunto de IDs únicos de documentos que contêm este termo
      const docsComTermo = new Set(this.indice[termo].map(entry => entry.id));

      // Fórmula IDF: log(N / df), onde N é o total de documentos e df é o número de documentos com o termo
      this.idf[termo] = Math.log(this.totalDocumentos / docsComTermo.size);
    }
  }

  /**
   * Realiza uma busca no sistema
   * @param {string} consulta - Texto da consulta
   * @param {Object} opcoes - Opções de busca (filtros, ordenação, página)
   * @returns {Object} - Resultados da busca com metadados
   */
  buscar(consulta, opcoes = {}) {
    // Verificar cache primeiro
    const chaveCache = this.gerarChaveCache(consulta, opcoes);
    if (this.configuracoes.cache.ativar && this.cacheConsultas.has(chaveCache)) {
      const timestampCache = this.timestampCache.get(chaveCache) || 0;
      const agora = Date.now();

      // Verificar se o cache ainda é válido
      if (agora - timestampCache < this.configuracoes.cache.tempoExpiracao * 1000) {
        return this.cacheConsultas.get(chaveCache);
      }
    }

    // Normalizar a consulta
    const termosConsulta = this.normalizarTexto(consulta);

    // Se não houver termos válidos após normalização
    if (termosConsulta.length === 0) {
      const resultadoVazio = {
        resultados: [],
        total: 0,
        pagina: opcoes.pagina || 1,
        totalPaginas: 0,
        tempoExecucao: 0,
        termosBuscados: [],
        sugestoes: [],
      };

      // Adicionar ao cache
      if (this.configuracoes.cache.ativar) {
        this.adicionarAoCache(chaveCache, resultadoVazio);
      }

      return resultadoVazio;
    }

    const inicioExecucao = Date.now();

    // Calcular pontuação TF-IDF para cada documento
    const pontuacoes = {};
    const documentosEncontrados = new Set();

    termosConsulta.forEach(termo => {
      // Se o termo não existe no índice
      if (!this.indice[termo]) return;

      // Para cada documento que contém o termo
      this.indice[termo].forEach(entry => {
        const { id, campo, freq, peso } = entry;
        documentosEncontrados.add(id);

        // Inicializar pontuação se necessário
        if (!pontuacoes[id]) {
          pontuacoes[id] = 0;
        }

        // Calcular TF-IDF com peso do campo
        // TF = frequência do termo no documento
        // IDF = importância do termo no corpus
        // peso = importância do campo (nome, descrição, etc.)
        const tfIdf = freq * (this.idf[termo] || 1) * peso;
        pontuacoes[id] += tfIdf;
      });
    });

    // Converter para array de resultados
    let resultados = Array.from(documentosEncontrados).map(id => ({
      produto: this.documentos[id],
      pontuacao: pontuacoes[id],
    }));

    // Aplicar filtros (se fornecidos)
    if (opcoes.filtros) {
      resultados = this.aplicarFiltros(resultados, opcoes.filtros);
    }

    // Ordenar por pontuação (do maior para o menor)
    resultados.sort((a, b) => b.pontuacao - a.pontuacao);

    // Aplicar ordenação secundária (se fornecida)
    if (opcoes.ordenacao) {
      resultados = this.aplicarOrdenacao(resultados, opcoes.ordenacao);
    }

    // Calcular paginação
    const pagina = opcoes.pagina || 1;
    const resultadosPorPagina =
      opcoes.resultadosPorPagina || this.configuracoes.paginacao.resultadosPorPagina;
    const totalResultados = resultados.length;
    const totalPaginas = Math.ceil(totalResultados / resultadosPorPagina);

    // Obter resultados da página atual
    const inicio = (pagina - 1) * resultadosPorPagina;
    const fim = inicio + resultadosPorPagina;
    const resultadosPaginados = resultados.slice(inicio, fim);

    // Gerar sugestões se não houver resultados suficientes
    let sugestoes = [];
    if (resultadosPaginados.length < resultadosPorPagina && this.configuracoes.sugestoes.ativar) {
      sugestoes = this.gerarSugestoes(consulta);
    }

    const tempoExecucao = Date.now() - inicioExecucao;

    // Formatar resultado final
    const resultado = {
      resultados: resultadosPaginados.map(r => ({
        ...r.produto,
        pontuacao: r.pontuacao,
      })),
      total: totalResultados,
      pagina,
      totalPaginas,
      tempoExecucao,
      termosBuscados: termosConsulta,
      sugestoes,
    };

    // Adicionar ao cache
    if (this.configuracoes.cache.ativar) {
      this.adicionarAoCache(chaveCache, resultado);
    }

    return resultado;
  }

  /**
   * Aplica filtros aos resultados da busca
   * @param {Array} resultados - Resultados da busca
   * @param {Object} filtros - Filtros a serem aplicados
   * @returns {Array} - Resultados filtrados
   */
  aplicarFiltros(resultados, filtros) {
    return resultados.filter(resultado => {
      const produto = resultado.produto;

      // Verificar cada filtro
      for (const [campo, valor] of Object.entries(filtros)) {
        // Ignorar filtros com valor undefined ou null
        if (valor === undefined || valor === null) continue;

        // Se o produto não tem o campo ou o campo é null/undefined, não passa no filtro
        if (produto[campo] === undefined || produto[campo] === null) return false;

        // Filtro de intervalo (min/max)
        if (typeof valor === 'object' && (valor.min !== undefined || valor.max !== undefined)) {
          const valorCampo = parseFloat(produto[campo]);
          if (isNaN(valorCampo)) return false;

          if (valor.min !== undefined && valorCampo < valor.min) return false;
          if (valor.max !== undefined && valorCampo > valor.max) return false;
        }
        // Filtro de array (verificar se contém)
        else if (Array.isArray(produto[campo])) {
          if (Array.isArray(valor)) {
            // Verificar se há pelo menos um valor em comum
            // Garantir que não haja erro se o array estiver vazio
            if (
              valor.length > 0 &&
              !valor.some(v => v !== undefined && v !== null && produto[campo].includes(v))
            )
              return false;
          } else {
            // Verificar se o array contém o valor
            // Garantir que não haja erro se o valor for undefined ou null
            if (valor !== undefined && valor !== null && !produto[campo].includes(valor))
              return false;
          }
        }
        // Filtro de igualdade
        else if (produto[campo] !== valor) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Aplica ordenação secundária aos resultados
   * @param {Array} resultados - Resultados da busca
   * @param {Object} ordenacao - Configuração de ordenação
   * @returns {Array} - Resultados ordenados
   */
  aplicarOrdenacao(resultados, ordenacao) {
    const { campo, direcao = 'asc' } = ordenacao;
    const multiplicador = direcao.toLowerCase() === 'desc' ? -1 : 1;

    // Ordenar mantendo a pontuação como critério primário
    return resultados.sort((a, b) => {
      // Se a diferença de pontuação for significativa, manter ordenação por pontuação
      const diferencaPontuacao = b.pontuacao - a.pontuacao;
      if (Math.abs(diferencaPontuacao) > 0.5) {
        return diferencaPontuacao;
      }

      // Caso contrário, ordenar pelo campo secundário
      const valorA = a.produto[campo];
      const valorB = b.produto[campo];

      // Ordenação numérica
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * multiplicador;
      }

      // Ordenação de strings
      if (typeof valorA === 'string' && typeof valorB === 'string') {
        return valorA.localeCompare(valorB) * multiplicador;
      }

      // Ordenação de datas
      if (valorA instanceof Date && valorB instanceof Date) {
        return (valorA.getTime() - valorB.getTime()) * multiplicador;
      }

      // Fallback para comparação simples
      if (valorA < valorB) return -1 * multiplicador;
      if (valorA > valorB) return 1 * multiplicador;
      return 0;
    });
  }

  /**
   * Gera sugestões de busca com base na consulta original
   * @param {string} consulta - Consulta original
   * @returns {Array} - Lista de sugestões
   */
  gerarSugestoes(consulta) {
    const termosConsulta = this.normalizarTexto(consulta);
    if (termosConsulta.length === 0) return [];

    const sugestoes = [];
    const termosIndice = Object.keys(this.indice);

    // Otimização: pré-filtrar termos do índice por comprimento
    // para reduzir o número de cálculos de distância de Levenshtein
    const distanciaMaxima = this.configuracoes.sugestoes.distanciaMaxima;

    // Para cada termo da consulta, encontrar termos similares no índice
    termosConsulta.forEach(termoConsulta => {
      // Pré-filtrar termos por comprimento para reduzir cálculos
      const termosFiltrados = termosIndice.filter(termoIndice => {
        // Se a diferença de comprimento é maior que a distância máxima,
        // não há como a distância de Levenshtein ser menor
        return Math.abs(termoConsulta.length - termoIndice.length) <= distanciaMaxima;
      });

      // Calcular distâncias e armazenar para evitar recálculos
      const distancias = new Map();
      const termosSimilares = termosFiltrados
        .filter(termoIndice => {
          // Calcular distância de Levenshtein
          const distancia = this.calcularDistanciaLevenshtein(termoConsulta, termoIndice);
          distancias.set(termoIndice, distancia); // Armazenar para uso posterior
          return distancia <= distanciaMaxima && distancia > 0; // Excluir o próprio termo
        })
        .sort((a, b) => {
          // Ordenar por distância e popularidade (número de documentos)
          const distanciaA = distancias.get(a);
          const distanciaB = distancias.get(b);

          if (distanciaA !== distanciaB) {
            return distanciaA - distanciaB;
          }

          // Desempate por popularidade (número de documentos que contêm o termo)
          const docsA = new Set(this.indice[a].map(entry => entry.id)).size;
          const docsB = new Set(this.indice[b].map(entry => entry.id)).size;
          return docsB - docsA;
        })
        .slice(0, 3); // Pegar os 3 mais relevantes para cada termo

      termosSimilares.forEach(termo => {
        // Criar uma nova consulta substituindo o termo atual
        const novaConsulta = termosConsulta.map(t => (t === termoConsulta ? termo : t)).join(' ');

        // Adicionar à lista de sugestões se ainda não existir
        if (Array.isArray(sugestoes) && !sugestoes.includes(novaConsulta)) {
          sugestoes.push(novaConsulta);
        }
      });
    });

    // Limitar número de sugestões
    return sugestoes.slice(0, this.configuracoes.sugestoes.maxSugestoes);
  }

  /**
   * Cache para armazenar resultados de cálculos de distância de Levenshtein
   * Formato: 'string1|string2' -> distância
   */
  #levenshteinCache = new Map();

  /**
   * Calcula a distância de Levenshtein entre duas strings com otimizações
   * @param {string} a - Primeira string
   * @param {string} b - Segunda string
   * @returns {number} - Distância de Levenshtein
   */
  calcularDistanciaLevenshtein(a, b) {
    // Verificações rápidas para casos simples
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Garantir que 'a' seja a string mais curta para otimização
    if (a.length > b.length) {
      [a, b] = [b, a]; // Trocar as strings
    }

    // Verificar se o resultado já está em cache
    const cacheKey = `${a}|${b}`;
    if (this.#levenshteinCache.has(cacheKey)) {
      return this.#levenshteinCache.get(cacheKey);
    }

    // Otimização para strings com diferença de comprimento maior que a distância máxima
    if (b.length - a.length > this.configuracoes.sugestoes.distanciaMaxima) {
      return this.configuracoes.sugestoes.distanciaMaxima + 1; // Retorna um valor maior que o máximo permitido
    }

    // Otimização para strings curtas (até 10 caracteres)
    if (a.length <= 10) {
      // Verificar caracteres iguais no início e fim para reduzir o tamanho do problema
      let i = 0;
      while (i < a.length && a.charAt(i) === b.charAt(i)) {
        i++;
      }

      let j = 0;
      while (j < a.length - i && a.charAt(a.length - 1 - j) === b.charAt(b.length - 1 - j)) {
        j++;
      }

      // Se identificamos prefixos/sufixos comuns, calcular apenas para a parte do meio
      if (i > 0 || j > 0) {
        if (i + j >= a.length) {
          // As strings são iguais nos caracteres que se sobrepõem
          const resultado = b.length - a.length;
          this.#levenshteinCache.set(cacheKey, resultado);
          return resultado;
        } else {
          // Calcular apenas para a parte do meio
          const resultado = this.calcularDistanciaLevenshtein(
            a.substring(i, a.length - j),
            b.substring(i, b.length - j)
          );
          this.#levenshteinCache.set(cacheKey, resultado);
          return resultado;
        }
      }
    }

    // Implementação otimizada usando apenas duas linhas da matriz
    // em vez da matriz completa, economizando memória
    let v0 = Array(b.length + 1).fill(0);
    let v1 = Array(b.length + 1).fill(0);

    // Inicializar a primeira linha
    for (let i = 0; i <= b.length; i++) {
      v0[i] = i;
    }

    // Preencher a matriz linha por linha
    for (let i = 0; i < a.length; i++) {
      v1[0] = i + 1;

      for (let j = 0; j < b.length; j++) {
        const custo = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(
          v1[j] + 1, // Inserção
          v0[j + 1] + 1, // Deleção
          v0[j] + custo // Substituição
        );
      }

      // Trocar as linhas para a próxima iteração
      [v0, v1] = [v1, v0];
    }

    // O resultado está na última posição calculada
    const resultado = v0[b.length];

    // Armazenar em cache se o resultado for menor ou igual à distância máxima
    // para evitar que o cache cresça demais com resultados irrelevantes
    if (resultado <= this.configuracoes.sugestoes.distanciaMaxima) {
      this.#levenshteinCache.set(cacheKey, resultado);

      // Limitar o tamanho do cache para evitar consumo excessivo de memória
      if (this.#levenshteinCache.size > 1000) {
        // Remover 20% das entradas mais antigas
        const entriesToRemove = Math.floor(this.#levenshteinCache.size * 0.2);
        const entries = Array.from(this.#levenshteinCache.keys());
        for (let i = 0; i < entriesToRemove; i++) {
          this.#levenshteinCache.delete(entries[i]);
        }
      }
    }

    return resultado;
  }

  /**
   * Gera uma chave única para o cache com base na consulta e opções
   * @param {string} consulta - Texto da consulta
   * @param {Object} opcoes - Opções de busca
   * @returns {string} - Chave para o cache
   */
  gerarChaveCache(consulta, opcoes) {
    return JSON.stringify({
      q: consulta,
      o: opcoes,
    });
  }

  /**
   * Adiciona um resultado ao cache
   * @param {string} chave - Chave do cache
   * @param {Object} resultado - Resultado a ser armazenado
   */
  adicionarAoCache(chave, resultado) {
    // Verificar se o cache está cheio
    if (this.cacheConsultas.size >= this.configuracoes.cache.tamanhoMaximo) {
      // Remover a entrada mais antiga
      const entradaMaisAntiga = Array.from(this.timestampCache.entries()).sort(
        (a, b) => a[1] - b[1]
      )[0];

      if (entradaMaisAntiga) {
        this.cacheConsultas.delete(entradaMaisAntiga[0]);
        this.timestampCache.delete(entradaMaisAntiga[0]);
      }
    }

    // Adicionar ao cache
    this.cacheConsultas.set(chave, resultado);
    this.timestampCache.set(chave, Date.now());
  }

  /**
   * Limpa entradas expiradas do cache
   */
  limparCacheExpirado() {
    const agora = Date.now();
    const tempoExpiracao = this.configuracoes.cache.tempoExpiracao * 1000;

    for (const [chave, timestamp] of this.timestampCache.entries()) {
      if (agora - timestamp > tempoExpiracao) {
        this.cacheConsultas.delete(chave);
        this.timestampCache.delete(chave);
      }
    }
  }

  /**
   * Remove um produto do índice
   * @param {string} id - ID do produto a ser removido
   */
  removerProduto(id) {
    if (!id || !this.documentos[id]) return;

    // Remover do armazenamento de documentos
    delete this.documentos[id];
    this.totalDocumentos--;

    // Remover de todos os termos no índice
    for (const termo in this.indice) {
      this.indice[termo] = this.indice[termo].filter(entry => entry.id !== id);

      // Se não houver mais documentos para este termo, remover o termo
      if (this.indice[termo].length === 0) {
        delete this.indice[termo];
        delete this.idf[termo];
      }
    }

    // Recalcular IDF
    this.calcularIDF();

    // Limpar cache
    this.cacheConsultas.clear();
    this.timestampCache.clear();
  }

  /**
   * Atualiza um produto no índice
   * @param {Object} produto - Produto atualizado
   */
  atualizarProduto(produto) {
    if (!produto || !produto.id) return;

    // Remover versão antiga
    this.removerProduto(produto.id);

    // Adicionar versão atualizada
    this.indexarProduto(produto);
  }

  /**
   * Reindexar todos os produtos
   */
  reindexarTudo() {
    // Armazenar todos os documentos atuais
    const documentos = Object.values(this.documentos);

    // Limpar índice
    this.indice = {};
    this.documentos = {};
    this.idf = {};
    this.totalDocumentos = 0;

    // Reindexar todos os documentos
    this.indexarProdutos(documentos);

    // Limpar cache
    this.cacheConsultas.clear();
    this.timestampCache.clear();
  }

  /**
   * Obtém estatísticas do sistema de busca
   * @returns {Object} - Estatísticas do sistema
   */
  obterEstatisticas() {
    const termosUnicos = Object.keys(this.indice).length;
    const tamanhoCache = this.cacheConsultas.size;

    // Calcular tamanho médio dos documentos (número de termos indexados)
    let totalTermosIndexados = 0;
    for (const termo in this.indice) {
      totalTermosIndexados += this.indice[termo].length;
    }

    const tamanhoMedioDocumento =
      this.totalDocumentos > 0 ? totalTermosIndexados / this.totalDocumentos : 0;

    return {
      totalDocumentos: this.totalDocumentos,
      termosUnicos,
      tamanhoMedioDocumento,
      tamanhoCache,
      camposIndexados: Object.keys(this.configuracoes.camposIndexados),
      tempoExpiracao: this.configuracoes.cache.tempoExpiracao,
    };
  }
}

// Exportar a classe para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SistemaBuscaAvancada };
} else if (typeof window !== 'undefined') {
  // Disponibilizar no escopo global quando em ambiente de navegador
  window.SistemaBuscaAvancada = SistemaBuscaAvancada;
}

// Exemplo de uso
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar o sistema de busca
  const sistemaBusca = new SistemaBuscaAvancada();

  // Exemplo de produtos (simulado)
  const produtos = [
    {
      id: 'bolo001',
      nome: 'Bolo de Chocolate com Morango',
      descricao: 'Delicioso bolo de chocolate com cobertura de morango fresco',
      categoria: 'bolos',
      tags: ['chocolate', 'morango', 'festa', 'aniversário'],
      ingredientes: ['chocolate', 'farinha', 'açúcar', 'morango', 'leite'],
      sabor: 'chocolate',
      ocasiao: 'aniversário',
      preco: 89.9,
      disponivel: true,
      tempoProducao: 48, // horas
    },
    {
      id: 'bolo002',
      nome: 'Bolo Red Velvet',
      descricao: 'Tradicional bolo vermelho com cobertura de cream cheese',
      categoria: 'bolos',
      tags: ['red velvet', 'cream cheese', 'festa', 'casamento'],
      ingredientes: ['farinha', 'açúcar', 'corante', 'cream cheese', 'manteiga'],
      sabor: 'red velvet',
      ocasiao: 'casamento',
      preco: 110.0,
      disponivel: true,
      tempoProducao: 72, // horas
    },
    {
      id: 'doce001',
      nome: 'Brigadeiro Gourmet',
      descricao: 'Brigadeiro artesanal feito com chocolate belga',
      categoria: 'doces',
      tags: ['brigadeiro', 'chocolate', 'festa'],
      ingredientes: ['chocolate belga', 'leite condensado', 'manteiga'],
      sabor: 'chocolate',
      ocasiao: 'festa',
      preco: 3.5,
      disponivel: true,
      tempoProducao: 24, // horas
    },
    {
      id: 'doce002',
      nome: 'Macaron de Framboesa',
      descricao: 'Delicado macaron francês com recheio de framboesa',
      categoria: 'doces',
      tags: ['macaron', 'framboesa', 'gourmet'],
      ingredientes: ['farinha de amêndoas', 'açúcar', 'claras', 'framboesa'],
      sabor: 'framboesa',
      ocasiao: 'presente',
      preco: 8.9,
      disponivel: true,
      tempoProducao: 48, // horas
    },
    {
      id: 'torta001',
      nome: 'Torta de Limão',
      descricao: 'Clássica torta de limão com base crocante e cobertura de merengue',
      categoria: 'tortas',
      tags: ['limão', 'merengue', 'sobremesa'],
      ingredientes: ['limão', 'leite condensado', 'biscoito', 'manteiga', 'claras'],
      sabor: 'limão',
      ocasiao: 'almoço',
      preco: 65.0,
      disponivel: true,
      tempoProducao: 24, // horas
    },
  ];

  // Indexar produtos
  sistemaBusca.indexarProdutos(produtos);

  // Demonstração das funcionalidades (para fins de teste)
  console.log('Sistema de Busca Avançada - Demonstração');

  // 1. Busca simples
  const resultadoBusca1 = sistemaBusca.buscar('chocolate');
  console.log("Busca por 'chocolate':", resultadoBusca1);

  // 2. Busca com filtros
  const resultadoBusca2 = sistemaBusca.buscar('bolo', {
    filtros: {
      categoria: 'bolos',
      preco: { min: 50, max: 100 },
    },
  });
  console.log("Busca por 'bolo' com filtros:", resultadoBusca2);

  // 3. Busca com ordenação
  const resultadoBusca3 = sistemaBusca.buscar('festa', {
    ordenacao: {
      campo: 'preco',
      direcao: 'asc',
    },
  });
  console.log("Busca por 'festa' ordenada por preço:", resultadoBusca3);

  // 4. Estatísticas do sistema
  const estatisticas = sistemaBusca.obterEstatisticas();
  console.log('Estatísticas do sistema:', estatisticas);
});
