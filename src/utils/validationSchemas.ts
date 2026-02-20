/**
 * Esquemas de validação para dados do sistema
 *
 * Este arquivo contém esquemas de validação para os diferentes tipos de dados
 * utilizados no sistema, garantindo integridade e prevenindo erros.
 */

import Ajv from 'ajv';

// Inicializar o validador Ajv
const ajv = new Ajv({ allErrors: true });

// Interfaces para tipagem
export interface Produto {
  id: string;
  nome: string;
  preco: number;
  descricao?: string | null;
  categoria?: string | null;
  imagens?: string[] | null;
  destaque: boolean;
  tags?: string[] | null;
  ingredientes?: string[] | null;
  sabor?: string | null;
  ocasiao?: string | null;
  disponivel: boolean;
  estoque?: number | null;
}

export interface FiltrosBusca {
  categoria?: string;
  precoMin?: number;
  precoMax?: number;
  tags?: string[];
  disponivel?: boolean;
  destaque?: boolean;
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: any[];
}

/**
 * Esquema de validação para produtos
 * Define a estrutura esperada para um produto válido
 */
export const produtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    nome: { type: 'string' },
    preco: { type: 'number', minimum: 0 },
    descricao: { type: ['string', 'null'] },
    categoria: { type: ['string', 'null'] },
    imagens: {
      oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }],
    },
    destaque: { type: 'boolean' },
    tags: {
      oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }],
    },
    ingredientes: {
      oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }],
    },
    sabor: { type: ['string', 'null'] },
    ocasiao: { type: ['string', 'null'] },
    disponivel: { type: 'boolean' },
    estoque: { type: ['number', 'null'], minimum: 0 },
  },
  required: ['id', 'nome', 'preco'],
  additionalProperties: true,
};

/**
 * Esquema de validação para filtros de busca
 * Define a estrutura esperada para filtros válidos
 */
export const filtroSchema = {
  type: 'object',
  properties: {
    categoria: { type: ['string', 'null'] },
    precoMin: { type: ['number', 'null'], minimum: 0 },
    precoMax: { type: ['number', 'null'], minimum: 0 },
    tags: {
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }, { type: 'null' }],
    },
    disponivel: { type: ['boolean', 'null'] },
    termo: { type: ['string', 'null'] },
    ordenacao: {
      type: ['object', 'null'],
      properties: {
        campo: { type: 'string' },
        direcao: { type: 'string', enum: ['asc', 'desc'] },
      },
      required: ['campo', 'direcao'],
    },
    paginacao: {
      type: ['object', 'null'],
      properties: {
        pagina: { type: 'number', minimum: 1 },
        limite: { type: 'number', minimum: 1 },
      },
      required: ['pagina', 'limite'],
    },
  },
  additionalProperties: true,
};

/**
 * Valida um produto de acordo com o esquema definido
 * @param produto - O produto a ser validado
 * @returns Um objeto contendo o resultado da validação e possíveis erros
 */
export function validarProduto(produto: unknown): ResultadoValidacao {
  const validate = ajv.compile(produtoSchema);
  const valido = validate(produto);

  return {
    valido,
    erros: validate.errors || [],
  };
}

/**
 * Valida filtros de busca de acordo com o esquema definido
 * @param filtros - Os filtros a serem validados
 * @returns Um objeto contendo o resultado da validação e possíveis erros
 */
export function validarFiltros(filtros: unknown): ResultadoValidacao {
  const validate = ajv.compile(filtroSchema);
  const valido = validate(filtros);

  return {
    valido,
    erros: validate.errors || [],
  };
}

/**
 * Sanitiza um produto, garantindo que todos os campos estejam em um formato válido
 * @param produto - O produto a ser sanitizado
 * @returns O produto sanitizado
 */
export function sanitizarProduto(produto: unknown): Produto | null {
  if (!produto) return null;

  // Cria uma cópia para não modificar o original
  // Tipamos como Record<string, any> para permitir acesso dinâmico por chave
  const sanitizado: Record<string, any> = { ...(produto as Record<string, any>) };

  // Garante que campos de string sejam strings válidas
  ['nome', 'descricao', 'categoria', 'sabor', 'ocasiao'].forEach(campo => {
    if (sanitizado[campo] === undefined || sanitizado[campo] === null) {
      sanitizado[campo] = '';
    } else if (typeof sanitizado[campo] !== 'string') {
      sanitizado[campo] = String(sanitizado[campo]);
    }
  });

  // Garante que arrays sejam arrays válidos
  ['imagens', 'tags', 'ingredientes'].forEach(campo => {
    if (!Array.isArray(sanitizado[campo])) {
      sanitizado[campo] = [];
    }
  });

  // Garante que campos numéricos sejam números válidos
  ['preco', 'estoque'].forEach(campo => {
    if (sanitizado[campo] === undefined || sanitizado[campo] === null) {
      sanitizado[campo] = campo === 'preco' ? 0 : null;
    } else if (typeof sanitizado[campo] !== 'number') {
      const valor = parseFloat(sanitizado[campo]);
      sanitizado[campo] = isNaN(valor) ? (campo === 'preco' ? 0 : null) : valor;
    }
  });

  // Garante que campos booleanos sejam booleanos válidos
  ['destaque', 'disponivel'].forEach(campo => {
    if (sanitizado[campo] === undefined || sanitizado[campo] === null) {
      sanitizado[campo] = false;
    } else if (typeof sanitizado[campo] !== 'boolean') {
      sanitizado[campo] = Boolean(sanitizado[campo]);
    }
  });

  // Retorna o objeto com tipagem explícita para Produto
  return sanitizado as Produto;
}
