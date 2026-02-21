/**
 * Algoritmos Alternativos para Strings Longas
 *
 * Este arquivo implementa algoritmos alternativos para comparação e busca de strings,
 * especialmente otimizados para strings longas, conforme recomendado nos próximos passos
 * do documento de otimizações do sistema de busca avançada.
 *
 * Implementações:
 * 1. BK-Tree (Burkhard-Keller Tree) - Estrutura de dados para busca eficiente por similaridade
 * 2. Trie - Estrutura de dados para busca de prefixos e sugestões
 * 3. Damerau-Levenshtein - Variante do Levenshtein que considera transposições
 */

/**
 * Implementação do algoritmo de Damerau-Levenshtein
 * Extensão do algoritmo de Levenshtein que considera transposições de caracteres adjacentes
 * como uma única operação, tornando-o mais adequado para erros de digitação comuns.
 *
 * Complexidade:
 * - Temporal: O(m*n) onde m e n são os comprimentos das strings
 * - Espacial: O(m*n) na implementação completa, O(min(m,n)) na implementação otimizada
 *
 * @param {string} a - Primeira string
 * @param {string} b - Segunda string
 * @param {number} maxDistance - Distância máxima a considerar (para early exit)
 * @returns {number} - Distância de Damerau-Levenshtein entre as strings
 */
function calcularDistanciaDamerauLevenshtein(a, b, maxDistance = Infinity) {
  // Verificações rápidas para casos simples
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Garantir que 'a' seja a string mais curta para otimização
  if (a.length > b.length) {
    [a, b] = [b, a]; // Trocar as strings
  }

  // Early exit se a diferença de comprimento for maior que a distância máxima
  if (b.length - a.length > maxDistance) {
    return maxDistance + 1;
  }

  // Implementação otimizada usando apenas duas linhas da matriz
  const v0 = Array(b.length + 1).fill(0);
  const v1 = Array(b.length + 1).fill(0);
  const v2 = Array(b.length + 1).fill(0);

  // Inicializar a primeira linha
  for (let i = 0; i <= b.length; i++) {
    v0[i] = i;
  }

  // Preencher a matriz
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;

    for (let j = 0; j < b.length; j++) {
      // Custo de substituição (0 se caracteres iguais, 1 se diferentes)
      const custo = a[i] === b[j] ? 0 : 1;

      // Operações padrão de Levenshtein (inserção, deleção, substituição)
      v1[j + 1] = Math.min(
        v1[j] + 1, // Inserção
        v0[j + 1] + 1, // Deleção
        v0[j] + custo // Substituição
      );

      // Adicionar verificação de transposição (Damerau)
      if (i > 0 && j > 0 && a[i] === b[j - 1] && a[i - 1] === b[j]) {
        v1[j + 1] = Math.min(v1[j + 1], v0[j - 1] + 1); // Transposição
      }
    }

    // Trocar as linhas para a próxima iteração
    [v0, v1] = [v1, v0];
  }

  return v0[b.length];
}

/**
 * Classe BKNode - Nó para a estrutura BK-Tree
 */
class BKNode {
  /**
   * @param {string} word - Palavra armazenada no nó
   */
  constructor(word) {
    this.word = word;
    this.children = new Map(); // Mapa de distância -> nó filho
  }
}

/**
 * Classe BKTree (Burkhard-Keller Tree)
 * Estrutura de dados especializada para busca eficiente por similaridade
 * Ideal para encontrar palavras dentro de uma distância de edição específica
 *
 * Complexidade:
 * - Inserção: O(log n) em média, onde n é o número de palavras na árvore
 * - Busca: O(log n) em média para palavras próximas, pior caso O(n)
 */
class BKTree {
  /**
   * @param {function} distanceFunction - Função para calcular distância entre strings
   */
  constructor(distanceFunction = calcularDistanciaDamerauLevenshtein) {
    this.root = null;
    this.distanceFunction = distanceFunction;
    this.size = 0;
  }

  /**
   * Adiciona uma palavra à árvore
   * @param {string} word - Palavra a ser adicionada
   */
  add(word) {
    if (!this.root) {
      this.root = new BKNode(word);
      this.size++;
      return;
    }

    this._addRecursive(this.root, word);
  }

  /**
   * Função auxiliar recursiva para adicionar palavra
   * @param {BKNode} node - Nó atual
   * @param {string} word - Palavra a ser adicionada
   * @private
   */
  _addRecursive(node, word) {
    // Calcular distância entre a palavra atual e a palavra do nó
    const distance = this.distanceFunction(node.word, word);

    // Se a distância for 0, a palavra já existe na árvore
    if (distance === 0) return;

    // Se não existe um filho com essa distância, criar um novo nó
    if (!node.children.has(distance)) {
      node.children.set(distance, new BKNode(word));
      this.size++;
      return;
    }

    // Se existe um filho com essa distância, continuar recursivamente
    this._addRecursive(node.children.get(distance), word);
  }

  /**
   * Busca palavras na árvore dentro de uma distância máxima
   * @param {string} word - Palavra de consulta
   * @param {number} maxDistance - Distância máxima permitida
   * @returns {Array} - Array de objetos {word, distance} ordenados por distância
   */
  search(word, maxDistance) {
    if (!this.root) return [];

    const results = [];
    this._searchRecursive(this.root, word, maxDistance, results);

    // Ordenar resultados por distância
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Função auxiliar recursiva para busca
   * @param {BKNode} node - Nó atual
   * @param {string} word - Palavra de consulta
   * @param {number} maxDistance - Distância máxima permitida
   * @param {Array} results - Array para armazenar resultados
   * @private
   */
  _searchRecursive(node, word, maxDistance, results) {
    // Calcular distância entre a palavra de consulta e a palavra do nó
    const distance = this.distanceFunction(node.word, word);

    // Se a distância for menor ou igual à máxima, adicionar aos resultados
    if (distance <= maxDistance) {
      results.push({
        word: node.word,
        distance: distance,
      });
    }

    // Buscar em subárvores que podem conter palavras dentro da distância máxima
    // Usando a desigualdade triangular para podar a busca
    for (let d = Math.max(1, distance - maxDistance); d <= distance + maxDistance; d++) {
      if (node.children.has(d)) {
        this._searchRecursive(node.children.get(d), word, maxDistance, results);
      }
    }
  }

  /**
   * Retorna o número de palavras na árvore
   * @returns {number} - Número de palavras
   */
  getSize() {
    return this.size;
  }

  /**
   * Constrói uma BK-Tree a partir de um array de palavras
   * @param {Array<string>} words - Array de palavras
   * @param {function} distanceFunction - Função para calcular distância
   * @returns {BKTree} - Nova BK-Tree contendo todas as palavras
   */
  static fromArray(words, distanceFunction) {
    const tree = new BKTree(distanceFunction);
    for (const word of words) {
      tree.add(word);
    }
    return tree;
  }
}

/**
 * Classe TrieNode - Nó para a estrutura Trie
 */
class TrieNode {
  constructor() {
    this.children = new Map(); // Mapa de caractere -> nó filho
    this.isEndOfWord = false; // Indica se o nó representa o fim de uma palavra
    this.word = null; // Palavra completa (apenas para nós que são fim de palavra)
    this.frequency = 0; // Frequência da palavra (útil para ordenar sugestões)
  }
}

/**
 * Classe Trie (Árvore de Prefixos)
 * Estrutura de dados otimizada para busca de prefixos e sugestões
 * Ideal para autocompletar e verificação ortográfica
 *
 * Complexidade:
 * - Inserção: O(m) onde m é o comprimento da palavra
 * - Busca: O(m) onde m é o comprimento da palavra
 * - Busca de prefixo: O(p) onde p é o comprimento do prefixo
 */
class Trie {
  constructor() {
    this.root = new TrieNode();
    this.size = 0;
  }

  /**
   * Insere uma palavra na Trie
   * @param {string} word - Palavra a ser inserida
   * @param {number} frequency - Frequência da palavra (opcional)
   */
  insert(word, frequency = 1) {
    let node = this.root;

    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }

    // Se a palavra não estava na Trie, incrementar o tamanho
    if (!node.isEndOfWord) {
      this.size++;
    }

    node.isEndOfWord = true;
    node.word = word;
    node.frequency += frequency; // Incrementar frequência
  }

  /**
   * Verifica se uma palavra existe na Trie
   * @param {string} word - Palavra a ser verificada
   * @returns {boolean} - Verdadeiro se a palavra existir
   */
  search(word) {
    const node = this._findNode(word);
    return node !== null && node.isEndOfWord;
  }

  /**
   * Verifica se existe alguma palavra com o prefixo dado
   * @param {string} prefix - Prefixo a ser verificado
   * @returns {boolean} - Verdadeiro se existir alguma palavra com o prefixo
   */
  startsWith(prefix) {
    return this._findNode(prefix) !== null;
  }

  /**
   * Encontra o nó correspondente a uma string
   * @param {string} str - String a ser buscada
   * @returns {TrieNode|null} - Nó encontrado ou null
   * @private
   */
  _findNode(str) {
    let node = this.root;

    for (const char of str) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char);
    }

    return node;
  }

  /**
   * Obtém sugestões para um prefixo
   * @param {string} prefix - Prefixo para buscar sugestões
   * @param {number} limit - Número máximo de sugestões
   * @returns {Array<Object>} - Array de objetos {word, frequency} ordenados por frequência
   */
  getSuggestions(prefix, limit = 10) {
    const node = this._findNode(prefix);
    if (!node) return [];

    const suggestions = [];
    this._collectWords(node, suggestions);

    // Ordenar por frequência (decrescente) e limitar número de sugestões
    return suggestions.sort((a, b) => b.frequency - a.frequency).slice(0, limit);
  }

  /**
   * Coleta todas as palavras a partir de um nó
   * @param {TrieNode} node - Nó inicial
   * @param {Array} suggestions - Array para armazenar sugestões
   * @private
   */
  _collectWords(node, suggestions) {
    if (node.isEndOfWord) {
      suggestions.push({
        word: node.word,
        frequency: node.frequency,
      });
    }

    for (const [char, childNode] of node.children) {
      this._collectWords(childNode, suggestions);
    }
  }

  /**
   * Obtém sugestões com tolerância a erros usando distância de edição
   * @param {string} word - Palavra de consulta
   * @param {number} maxDistance - Distância máxima permitida
   * @param {number} limit - Número máximo de sugestões
   * @param {function} distanceFunction - Função para calcular distância
   * @returns {Array<Object>} - Array de objetos {word, distance, frequency}
   */
  getFuzzySuggestions(
    word,
    maxDistance = 2,
    limit = 10,
    distanceFunction = calcularDistanciaDamerauLevenshtein
  ) {
    const suggestions = [];
    this._collectAllWords(this.root, []);

    // Calcular distância para todas as palavras na Trie
    const allWords = [];
    this._collectAllWords(this.root, allWords);

    const results = [];
    for (const wordObj of allWords) {
      const distance = distanceFunction(word, wordObj.word, maxDistance);
      if (distance <= maxDistance) {
        results.push({
          word: wordObj.word,
          distance: distance,
          frequency: wordObj.frequency,
        });
      }
    }

    // Ordenar por distância (crescente) e frequência (decrescente)
    return results
      .sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return b.frequency - a.frequency;
      })
      .slice(0, limit);
  }

  /**
   * Coleta todas as palavras na Trie
   * @param {TrieNode} node - Nó atual
   * @param {Array} words - Array para armazenar palavras
   * @private
   */
  _collectAllWords(node, words) {
    if (node.isEndOfWord) {
      words.push({
        word: node.word,
        frequency: node.frequency,
      });
    }

    for (const [char, childNode] of node.children) {
      this._collectAllWords(childNode, words);
    }
  }

  /**
   * Retorna o número de palavras na Trie
   * @returns {number} - Número de palavras
   */
  getSize() {
    return this.size;
  }

  /**
   * Constrói uma Trie a partir de um array de palavras
   * @param {Array<string>|Array<Object>} items - Array de palavras ou objetos {word, frequency}
   * @returns {Trie} - Nova Trie contendo todas as palavras
   */
  static fromArray(items) {
    const trie = new Trie();

    for (const item of items) {
      if (typeof item === 'string') {
        trie.insert(item);
      } else if (typeof item === 'object' && item.word) {
        trie.insert(item.word, item.frequency || 1);
      }
    }

    return trie;
  }
}

// Exportar classes e funções
module.exports = {
  calcularDistanciaDamerauLevenshtein,
  BKTree,
  Trie,
};
