export interface Product {
  id: string;
  producerId?: string; // Adicionado para multi-produtor
  nome: string;
  descricao: string;
  preco: number;
  discountPrice?: number; // Preço promocional (Premium)
  videoUrl?: string; // Link de vídeo demonstrativo (Premium)
  categoria: string;
  disponivel: boolean;
  destacado?: boolean;
  isPromoted?: boolean; // Se o produto está em destaque pago (Premium)
  imagens: string[]; // Obrigatório
  ingredientes?: string[];
  tempoPreparacao?: number; // em minutos
  variations?: ProductVariation[]; // Variações de produto
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
}

export interface ProductVariation {
  id: string;
  name: string; // Ex: "Tamanho", "Sabor"
  options: {
    id: string;
    label: string; // Ex: "Pequeno", "Chocolate"
    priceAdjustment: number; // Acréscimo ou desconto no preço
  }[];
  required: boolean;
  maxSelections?: number;
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
  ordenarPor?: string;
  ordem?: 'asc' | 'desc';
  limite?: number;
}

export interface ProductStats {
  total?: number;
  disponiveis?: number;
  indisponiveis?: number;
  destacados?: number;
  semEstoque?: number;
  categorias?: Record<string, number>;
  vendasTotais?: number;
  quantidadeVendida?: number;
  avaliacaoMedia?: number;
  quantidadeAvaliacoes?: number;
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
