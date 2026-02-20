/**
 * Serviço de Otimização de Embalagens
 *
 * Este serviço implementa algoritmos para calcular a melhor combinação de embalagens
 * para cada pedido, minimizando custos e desperdício de material.
 */

// Interfaces para o serviço de otimização de embalagens
export interface Dimensions {
  width: number; // largura em cm
  height: number; // altura em cm
  length: number; // comprimento em cm
}

export interface PackageBox {
  id: string;
  name: string;
  dimensions: Dimensions;
  maxWeight: number; // peso máximo suportado em gramas
  cost: number; // custo da embalagem em reais
  isFragile: boolean; // indica se a embalagem é para itens frágeis
  isInsulated: boolean; // indica se a embalagem é térmica
}

export interface ProductPackagingInfo {
  productId: string;
  dimensions: Dimensions;
  weight: number; // peso em gramas
  isFragile: boolean; // indica se o produto é frágil
  requiresRefrigeration: boolean; // indica se o produto precisa de refrigeração
  quantity: number; // quantidade do produto no pedido
}

export interface PackagingResult {
  boxes: PackageBox[];
  boxAssignments: Map<string, ProductPackagingInfo[]>; // mapeamento de caixa para produtos
  totalCost: number;
  wastedSpace: number; // porcentagem de espaço desperdiçado
  packingEfficiency: number; // porcentagem de eficiência (100 - wastedSpace)
}

export interface PackagingOptimizationConfig {
  prioritizeCost: boolean; // priorizar custo sobre desperdício
  maxWastedSpace: number; // porcentagem máxima de espaço desperdiçado permitido
  allowMultipleBoxes: boolean; // permitir múltiplas caixas por pedido
  considerFragility: boolean; // considerar fragilidade dos produtos
  considerRefrigeration: boolean; // considerar necessidade de refrigeração
  maxBoxesPerOrder: number; // número máximo de caixas por pedido
}

/**
 * Serviço para otimização de embalagens de pedidos
 * Implementa o padrão Singleton
 */
export class PackagingOptimizationService {
  private static instance: PackagingOptimizationService;
  private config: PackagingOptimizationConfig;
  private availableBoxes: PackageBox[];

  /**
   * Configuração padrão para otimização de embalagens
   */
  private readonly DEFAULT_CONFIG: PackagingOptimizationConfig = {
    prioritizeCost: true,
    maxWastedSpace: 30, // 30% de espaço desperdiçado máximo
    allowMultipleBoxes: true,
    considerFragility: true,
    considerRefrigeration: true,
    maxBoxesPerOrder: 3,
  };

  /**
   * Embalagens padrão disponíveis
   */
  private readonly DEFAULT_BOXES: PackageBox[] = [
    {
      id: 'box_small',
      name: 'Caixa Pequena',
      dimensions: { width: 15, height: 10, length: 15 },
      maxWeight: 1000,
      cost: 2.5,
      isFragile: false,
      isInsulated: false,
    },
    {
      id: 'box_medium',
      name: 'Caixa Média',
      dimensions: { width: 25, height: 15, length: 25 },
      maxWeight: 3000,
      cost: 4.0,
      isFragile: false,
      isInsulated: false,
    },
    {
      id: 'box_large',
      name: 'Caixa Grande',
      dimensions: { width: 40, height: 30, length: 40 },
      maxWeight: 5000,
      cost: 6.5,
      isFragile: false,
      isInsulated: false,
    },
    {
      id: 'box_fragile',
      name: 'Caixa para Itens Frágeis',
      dimensions: { width: 30, height: 20, length: 30 },
      maxWeight: 2000,
      cost: 7.0,
      isFragile: true,
      isInsulated: false,
    },
    {
      id: 'box_insulated',
      name: 'Caixa Térmica',
      dimensions: { width: 35, height: 25, length: 35 },
      maxWeight: 4000,
      cost: 9.0,
      isFragile: false,
      isInsulated: true,
    },
  ];

  /**
   * Construtor privado para implementar Singleton
   */
  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
    this.availableBoxes = [...this.DEFAULT_BOXES];
  }

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): PackagingOptimizationService {
    if (!PackagingOptimizationService.instance) {
      PackagingOptimizationService.instance = new PackagingOptimizationService();
    }
    return PackagingOptimizationService.instance;
  }

  /**
   * Configura o serviço de otimização de embalagens
   */
  public configure(config: Partial<PackagingOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Adiciona uma nova embalagem às opções disponíveis
   */
  public addPackageBox(box: PackageBox): void {
    // Verifica se já existe uma caixa com o mesmo ID
    const existingIndex = this.availableBoxes.findIndex(b => b.id === box.id);
    if (existingIndex >= 0) {
      // Substitui a caixa existente
      this.availableBoxes[existingIndex] = box;
    } else {
      // Adiciona nova caixa
      this.availableBoxes.push(box);
    }
  }

  /**
   * Remove uma embalagem das opções disponíveis
   */
  public removePackageBox(boxId: string): boolean {
    const initialLength = this.availableBoxes.length;
    this.availableBoxes = this.availableBoxes.filter(box => box.id !== boxId);
    return initialLength !== this.availableBoxes.length;
  }

  /**
   * Obtém todas as embalagens disponíveis
   */
  public getAvailableBoxes(): PackageBox[] {
    return [...this.availableBoxes];
  }

  /**
   * Calcula o volume de uma dimensão em cm³
   */
  private calculateVolume(dimensions: Dimensions): number {
    return dimensions.width * dimensions.height * dimensions.length;
  }

  /**
   * Verifica se um produto cabe em uma caixa
   */
  private productFitsInBox(product: ProductPackagingInfo, box: PackageBox): boolean {
    // Verifica se as dimensões do produto cabem na caixa
    return (
      product.dimensions.width <= box.dimensions.width &&
      product.dimensions.height <= box.dimensions.height &&
      product.dimensions.length <= box.dimensions.length &&
      product.weight <= box.maxWeight &&
      (!product.isFragile || box.isFragile) &&
      (!product.requiresRefrigeration || box.isInsulated)
    );
  }

  /**
   * Calcula a melhor combinação de embalagens para um conjunto de produtos
   */
  public optimizePackaging(products: ProductPackagingInfo[]): PackagingResult {
    // Expandir produtos com base na quantidade
    const expandedProducts: ProductPackagingInfo[] = [];
    products.forEach(product => {
      for (let i = 0; i < product.quantity; i++) {
        expandedProducts.push({ ...product, quantity: 1 });
      }
    });

    // Ordenar produtos por volume (do maior para o menor)
    expandedProducts.sort((a, b) => {
      const volumeA = this.calculateVolume(a.dimensions);
      const volumeB = this.calculateVolume(b.dimensions);
      return volumeB - volumeA;
    });

    // Inicializar resultado
    const result: PackagingResult = {
      boxes: [],
      boxAssignments: new Map(),
      totalCost: 0,
      wastedSpace: 0,
      packingEfficiency: 0,
    };

    // Algoritmo First-Fit Decreasing para empacotar produtos
    const packProducts = () => {
      // Filtrar caixas adequadas para produtos frágeis e refrigerados
      let filteredBoxes = [...this.availableBoxes];
      if (this.config.considerFragility) {
        const hasFragileProducts = expandedProducts.some(p => p.isFragile);
        if (hasFragileProducts) {
          filteredBoxes = filteredBoxes.filter(box => box.isFragile);
        }
      }

      if (this.config.considerRefrigeration) {
        const hasRefrigeratedProducts = expandedProducts.some(p => p.requiresRefrigeration);
        if (hasRefrigeratedProducts) {
          filteredBoxes = filteredBoxes.filter(box => box.isInsulated);
        }
      }

      // Ordenar caixas por volume (do menor para o maior)
      filteredBoxes.sort((a, b) => {
        const volumeA = this.calculateVolume(a.dimensions);
        const volumeB = this.calculateVolume(b.dimensions);
        return volumeA - volumeB;
      });

      // Inicializar caixas usadas
      const usedBoxes: {
        box: PackageBox;
        remainingVolume: number;
        remainingWeight: number;
        products: ProductPackagingInfo[];
      }[] = [];

      // Tentar empacotar cada produto
      for (const product of expandedProducts) {
        let packed = false;

        // Calcular volume do produto
        const productVolume = this.calculateVolume(product.dimensions);

        // Tentar colocar o produto em uma caixa existente
        for (const usedBox of usedBoxes) {
          if (
            this.productFitsInBox(product, usedBox.box) &&
            usedBox.remainingVolume >= productVolume &&
            usedBox.remainingWeight >= product.weight
          ) {
            // Produto cabe nesta caixa
            usedBox.products.push(product);
            usedBox.remainingVolume -= productVolume;
            usedBox.remainingWeight -= product.weight;
            packed = true;
            break;
          }
        }

        // Se não conseguiu empacotar em nenhuma caixa existente, criar uma nova
        if (
          !packed &&
          this.config.allowMultipleBoxes &&
          usedBoxes.length < this.config.maxBoxesPerOrder
        ) {
          // Encontrar a menor caixa que acomoda o produto
          for (const box of filteredBoxes) {
            if (this.productFitsInBox(product, box)) {
              const boxVolume = this.calculateVolume(box.dimensions);
              const newBox = {
                box,
                remainingVolume: boxVolume - productVolume,
                remainingWeight: box.maxWeight - product.weight,
                products: [product],
              };
              usedBoxes.push(newBox);
              packed = true;
              break;
            }
          }
        }

        // Se ainda não conseguiu empacotar, tentar usar uma caixa maior
        if (
          !packed &&
          this.config.allowMultipleBoxes &&
          usedBoxes.length < this.config.maxBoxesPerOrder
        ) {
          // Encontrar a menor caixa que acomoda o produto, mesmo que não seja ideal
          for (const box of this.availableBoxes) {
            if (this.productFitsInBox(product, box)) {
              const boxVolume = this.calculateVolume(box.dimensions);
              const newBox = {
                box,
                remainingVolume: boxVolume - productVolume,
                remainingWeight: box.maxWeight - product.weight,
                products: [product],
              };
              usedBoxes.push(newBox);
              packed = true;
              break;
            }
          }
        }

        // Se ainda não conseguiu empacotar, não é possível empacotar este produto
        if (!packed) {
          return false;
        }
      }

      // Calcular resultado
      result.boxes = usedBoxes.map(ub => ub.box);
      result.totalCost = usedBoxes.reduce((sum, ub) => sum + ub.box.cost, 0);

      // Calcular eficiência de empacotamento
      let totalBoxVolume = 0;
      let totalProductVolume = 0;

      usedBoxes.forEach(ub => {
        const boxVolume = this.calculateVolume(ub.box.dimensions);
        totalBoxVolume += boxVolume;

        // Atualizar mapa de atribuições
        result.boxAssignments.set(ub.box.id, [...ub.products]);

        // Calcular volume total dos produtos nesta caixa
        const productsVolume = ub.products.reduce(
          (sum, p) => sum + this.calculateVolume(p.dimensions),
          0
        );
        totalProductVolume += productsVolume;
      });

      // Calcular espaço desperdiçado e eficiência
      result.wastedSpace = ((totalBoxVolume - totalProductVolume) / totalBoxVolume) * 100;
      result.packingEfficiency = 100 - result.wastedSpace;

      return true;
    };

    // Tentar empacotar produtos
    const success = packProducts();

    // Se não conseguiu empacotar todos os produtos, retornar resultado vazio
    if (!success) {
      return {
        boxes: [],
        boxAssignments: new Map(),
        totalCost: 0,
        wastedSpace: 100,
        packingEfficiency: 0,
      };
    }

    return result;
  }

  /**
   * Estima o custo de embalagem para um pedido com base nos produtos
   */
  public estimatePackagingCost(products: ProductPackagingInfo[]): number {
    const result = this.optimizePackaging(products);
    return result.totalCost;
  }

  /**
   * Sugere melhorias para reduzir custos de embalagem
   */
  public suggestPackagingImprovements(result: PackagingResult): string[] {
    const suggestions: string[] = [];

    // Verificar eficiência de empacotamento
    if (result.packingEfficiency < 70) {
      suggestions.push(
        'A eficiência de empacotamento está abaixo de 70%. Considere usar caixas menores ou agrupar produtos de forma diferente.'
      );
    }

    // Verificar número de caixas
    if (result.boxes.length > 1) {
      suggestions.push(
        `Pedido utilizando ${result.boxes.length} caixas. Considere agrupar produtos para reduzir o número de caixas.`
      );
    }

    // Verificar uso de caixas especiais
    const fragileBoxCount = result.boxes.filter(box => box.isFragile).length;
    const insulatedBoxCount = result.boxes.filter(box => box.isInsulated).length;

    if (fragileBoxCount > 0) {
      suggestions.push(
        `Utilizando ${fragileBoxCount} caixa(s) para itens frágeis. Estas caixas têm custo adicional.`
      );
    }

    if (insulatedBoxCount > 0) {
      suggestions.push(
        `Utilizando ${insulatedBoxCount} caixa(s) térmica(s). Estas caixas têm custo adicional.`
      );
    }

    return suggestions;
  }

  /**
   * Gera um relatório de uso de embalagens para análise
   */
  public generatePackagingReport(
    period: { start: Date; end: Date },
    packagingResults: PackagingResult[]
  ): any {
    // Implementação básica de relatório
    const totalOrders = packagingResults.length;
    const totalBoxesUsed = packagingResults.reduce((sum, result) => sum + result.boxes.length, 0);
    const totalCost = packagingResults.reduce((sum, result) => sum + result.totalCost, 0);
    const averageBoxesPerOrder = totalBoxesUsed / totalOrders;
    const averageCostPerOrder = totalCost / totalOrders;
    const averageEfficiency =
      packagingResults.reduce((sum, result) => sum + result.packingEfficiency, 0) / totalOrders;

    // Contagem de tipos de caixas usadas
    const boxTypeCounts: Record<string, number> = {};
    packagingResults.forEach(result => {
      result.boxes.forEach(box => {
        boxTypeCounts[box.id] = (boxTypeCounts[box.id] || 0) + 1;
      });
    });

    return {
      period,
      totalOrders,
      totalBoxesUsed,
      totalCost,
      averageBoxesPerOrder,
      averageCostPerOrder,
      averageEfficiency,
      boxTypeCounts,
    };
  }
}
