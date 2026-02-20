export interface Product {
  id: string;
  producerId: string; // ID do produtor (Store ID no Stripe)
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  disponivel: boolean;
  imagens?: string[];
  ingredientes?: string[];
  tempoPreparacao?: number; // em minutos
  leadTimeDays?: number; // Antecedência necessária em dias
  destacado?: boolean;
  // Compatibilidade com testes que usam propriedade 'peso'
  peso?: number;
  // Compatibilidade com testes que usam dimensões físicas
  dimensoes?: {
    altura: number;
    largura: number;
    profundidade: number;
  };
  pesoAproximado?: number; // em gramas
  informacoesNutricionais?: NutricionalInfo;
  avaliacoes?: ProductReview[];
  dataCriacao: Date;
  dataAtualizacao?: Date;
  estoque?: number;
  temEstoque?: boolean;
  alergenos?: string[];
  tagsEspeciais?: string[]; // Ex: "sem glúten", "vegano", etc.
  detalhes?: Record<string, string | number>; // Informações adicionais como peso, dimensões, etc.
  tags?: ProductTag[];
  nutricional?: NutricionalInfo;
  custoIngredientes?: number;
  custoMaoDeObra?: number;
  custoEmbalagem?: number;
}

export interface NutricionalInfo {
  calorias?: number;
  carboidratos?: number;
  proteinas?: number;
  gorduras?: number;
  gordurasSaturadas?: number;
  sodio?: number;
  acucares?: number;
  porcao?: number; // em gramas
}

export interface ProductReview {
  id: string;
  clienteId: string;
  clienteNome: string;
  avaliacao: number; // 1 a 5
  comentario?: string;
  data: Date;
}



export interface ProductFilter {
  categoria?: string;
  disponivel?: boolean;
  destacado?: boolean;
  precoMin?: number;
  precoMax?: number;
  tagEspecial?: string;
  busca?: string;
  producerId?: string;
  ordenarPor?: keyof Product | "preco" | "avaliacao" | "dataCriacao" | "mais_vendido";
  ordem?: "asc" | "desc";
  limite?: number;
}
export interface ProductStats {
  vendasTotais: number;
  quantidadeVendida: number;
  avaliacaoMedia: number;
  quantidadeAvaliacoes: number;
}

export enum ProductCategories {
  BOLOS = 'bolos',
  TORTAS = 'tortas',
  DOCINHOS = 'docinhos',
  CUPCAKES = 'cupcakes',
  SOBREMESAS = 'sobremesas',
  SALGADOS = 'salgados',
  KIT_FESTA = 'kit_festa',
  BEBIDAS = 'bebidas',
}

export enum ProductTag {
  SEM_GLUTEN = 'sem_gluten',
  SEM_LACTOSE = 'sem_lactose',
  VEGANO = 'vegano',
  DIET = 'diet',
  LIGHT = 'light',
  ORGANICO = 'organico',
  PROMOCAO = 'promocao',
  NOVO = 'novo',
  MAIS_VENDIDO = 'mais_vendido',
}
