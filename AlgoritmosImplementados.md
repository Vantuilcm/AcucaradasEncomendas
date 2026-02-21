# Algoritmos Implementados

Este documento contém uma lista dos algoritmos implementados no sistema da Açucaradas Encomendas, incluindo suas descrições, complexidades e benefícios.

## Algoritmos Implementados

### 1. Recomendação Personalizada

**Descrição**: Algoritmo que analisa o histórico de compras do usuário para recomendar produtos relevantes, utilizando técnicas de filtragem colaborativa e baseada em conteúdo.

**Complexidade**:

- Temporal: O(n log n) - onde n é o número de produtos no histórico do usuário
- Espacial: O(n) - para armazenar os dados de produtos e preferências

**Benefícios**:

- Aumento nas vendas por meio de recomendações relevantes
- Melhoria na experiência do usuário
- Possibilidade de descoberta de novos produtos

### 2. Gerenciamento de Carrinho

**Descrição**: Algoritmo que otimiza a gestão do carrinho de compras, incluindo cálculos de descontos, agrupamento de itens e validação de disponibilidade.

**Complexidade**:

- Temporal: O(n) - onde n é o número de itens no carrinho
- Espacial: O(n) - para armazenar os dados do carrinho

**Benefícios**:

- Processamento eficiente de carrinhos com muitos itens
- Cálculo preciso de preços e descontos
- Melhor experiência de checkout

### 3. Detecção de Fraudes em Pedidos

**Descrição**: Sistema que analisa pedidos em busca de padrões suspeitos, utilizando múltiplos critérios de avaliação e um sistema de pontuação ponderada para identificar possíveis fraudes.

**Complexidade**:

- Temporal: O(n log n) - onde n é o número de pedidos anteriores do usuário
- Espacial: O(n) - para armazenar os dados de análise

**Benefícios**:

- Detecção proativa de fraudes
- Sistema configurável e adaptável
- Explicabilidade nas decisões
- Baixo impacto no fluxo de pedidos legítimos

### 4. Otimização de Rotas de Entrega

**Descrição**: Algoritmo que otimiza as rotas de entrega utilizando variantes do Problema do Caixeiro Viajante (TSP), com agrupamento geográfico de pontos, consideração de janelas de tempo e prioridades de entrega.

**Complexidade**:

- Temporal:
  - Algoritmo guloso: O(n²) - onde n é o número de pontos de entrega
  - Algoritmo exato: O(n!) - limitado a poucos pontos (≤10)
  - Clustering: O(n²) - para agrupar pontos por proximidade
- Espacial: O(n) - para armazenar os dados de rotas e pontos

**Benefícios**:

- Redução significativa de custos de transporte
- Otimização do tempo dos entregadores
- Melhor cumprimento de prazos de entrega
- Adaptação a condições de tráfego e horários de pico
- Priorização de entregas urgentes
- Balanceamento automático de carga entre entregadores

### 5. Precificação Dinâmica

**Descrição**: Sistema de sugestão de preços que respeita a autonomia do produtor, analisando dados de demanda, sazonalidade e competição para recomendar ajustes de preço que otimizem as vendas e a receita.

**Complexidade**:

- Temporal: O(n) - onde n é o número de pontos de dados históricos de vendas
- Espacial: O(n) - para armazenar os dados históricos e análises

**Benefícios**:

- Respeito à autonomia do produtor na definição de preços
- Otimização de receita baseada em dados reais
- Adaptação automática a eventos sazonais
- Resposta a mudanças de demanda e competição
- Transparência nas sugestões com explicações detalhadas
- Ajustes automáticos limitados e configuráveis

### 6. Previsão de Demanda

**Descrição**: Algoritmo que utiliza técnicas estatísticas e de séries temporais para prever a demanda futura de produtos com base em dados históricos de vendas, sazonalidade e tendências, auxiliando no planejamento de produção e gestão de estoque.

**Complexidade**:

- Temporal: O(n) - onde n é o número de pontos de dados históricos de vendas
- Espacial: O(n) - para armazenar os dados históricos, análises e previsões

**Benefícios**:

- Otimização de estoque e redução de desperdício
- Melhor planejamento de produção e compras
- Preparação antecipada para picos de demanda sazonal
- Agrupamento de produtos com padrões de demanda similares
- Cálculo de capacidade de produção necessária
- Ajuste automático de níveis de estoque recomendados

### 7. Segmentação de Clientes

**Descrição**: Algoritmo que analisa o comportamento de compra dos clientes (recência, frequência, valor monetário) e os agrupa em segmentos com características similares, permitindo estratégias de marketing personalizadas e análise de valor do tempo de vida (LTV).

**Complexidade**:

- Temporal: O(n log n) - onde n é o número de clientes
- Espacial: O(n) - para armazenar os dados de clientes e segmentos

**Benefícios**:

- Identificação de segmentos de alto valor
- Personalização de estratégias de marketing
- Melhor alocação de recursos de marketing
- Identificação de clientes em risco de abandono
- Cálculo preciso de LTV (Lifetime Value)
- Recomendações personalizadas por segmento

### 8. Otimização de Embalagens

**Descrição**: Algoritmo que calcula a melhor combinação de embalagens para um conjunto de produtos, minimizando custos e desperdício de espaço, considerando restrições como fragilidade e necessidade de refrigeração.

**Complexidade**:

- Temporal: O(n log n) - onde n é o número de produtos a serem embalados
- Espacial: O(n) - para armazenar os dados de produtos, embalagens e atribuições

**Benefícios**:

- Redução significativa de custos de embalagem
- Minimização de desperdício de material
- Consideração de requisitos especiais (fragilidade, refrigeração)
- Sugestões de melhoria para otimizar embalagens
- Relatórios de eficiência de empacotamento
- Adaptação a diferentes configurações de prioridade (custo vs. eficiência)
- Estimativa precisa de custos de embalagem para novos pedidos

#### Implementação Detalhada

**Estruturas de Dados**:

```typescript
// Dimensões de produtos e embalagens
interface Dimensions {
  width: number; // largura em cm
  height: number; // altura em cm
  length: number; // comprimento em cm
}

// Definição de uma caixa de embalagem
interface PackageBox {
  id: string;
  name: string;
  dimensions: Dimensions;
  maxWeight: number; // peso máximo suportado em gramas
  cost: number; // custo da embalagem em reais
  isFragile: boolean; // indica se a embalagem é para itens frágeis
  isInsulated: boolean; // indica se a embalagem é térmica
}

// Informações de um produto para embalagem
interface ProductPackagingInfo {
  productId: string;
  dimensions: Dimensions;
  weight: number; // peso em gramas
  isFragile: boolean; // indica se o produto é frágil
  requiresRefrigeration: boolean; // indica se o produto precisa de refrigeração
  quantity: number; // quantidade do produto no pedido
}

// Resultado da otimização de embalagens
interface PackagingResult {
  boxes: PackageBox[];
  boxAssignments: Map<string, ProductPackagingInfo[]>; // mapeamento de caixa para produtos
  totalCost: number;
  wastedSpace: number; // porcentagem de espaço desperdiçado
  packingEfficiency: number; // porcentagem de eficiência (100 - wastedSpace)
}
```

**Algoritmo First-Fit Decreasing**:

O algoritmo First-Fit Decreasing é uma heurística para resolver o problema de empacotamento (Bin Packing Problem), que é NP-difícil. A implementação segue os seguintes passos:

1. **Expansão de produtos**: Expandir produtos com base na quantidade (criar uma entrada para cada unidade).
2. **Ordenação por volume**: Ordenar produtos do maior para o menor volume.
3. **Filtragem de caixas**: Filtrar caixas adequadas com base em requisitos especiais (fragilidade, refrigeração).
4. **Ordenação de caixas**: Ordenar caixas do menor para o maior volume.
5. **Empacotamento**: Para cada produto, tentar colocá-lo em uma caixa existente ou criar uma nova caixa.
6. **Cálculo de eficiência**: Calcular o espaço desperdiçado e a eficiência de empacotamento.

```typescript
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
    packingEfficiency: 0
  };

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
  const usedBoxes: { box: PackageBox; remainingVolume: number; remainingWeight: number; products: ProductPackagingInfo[] }[] = [];

  // Tentar empacotar cada produto
  for (const product of expandedProducts) {
    let packed = false;
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
    if (!packed) {
      // Encontrar a menor caixa que acomoda o produto
      for (const box of filteredBoxes) {
        if (this.productFitsInBox(product, box)) {
          const boxVolume = this.calculateVolume(box.dimensions);
          const newBox = {
            box,
            remainingVolume: boxVolume - productVolume,
            remainingWeight: box.maxWeight - product.weight,
            products: [product]
          };
          usedBoxes.push(newBox);
          packed = true;
          break;
        }
      }
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

  return result;
}
```

**Funcionalidades Adicionais**:

1. **Sugestões de Melhoria**: O serviço pode analisar os resultados e sugerir melhorias para reduzir custos e aumentar a eficiência.

```typescript
public suggestPackagingImprovements(result: PackagingResult): string[] {
  const suggestions: string[] = [];

  // Verificar eficiência de empacotamento
  if (result.packingEfficiency < 70) {
    suggestions.push('A eficiência de empacotamento está abaixo de 70%. Considere usar caixas menores ou agrupar produtos de forma diferente.');
  }

  // Verificar número de caixas
  if (result.boxes.length > 1) {
    suggestions.push(`Pedido utilizando ${result.boxes.length} caixas. Considere agrupar produtos para reduzir o número de caixas.`);
  }

  // Verificar uso de caixas especiais
  const fragileBoxCount = result.boxes.filter(box => box.isFragile).length;
  const insulatedBoxCount = result.boxes.filter(box => box.isInsulated).length;

  if (fragileBoxCount > 0) {
    suggestions.push(`Utilizando ${fragileBoxCount} caixa(s) para itens frágeis. Estas caixas têm custo adicional.`);
  }

  if (insulatedBoxCount > 0) {
    suggestions.push(`Utilizando ${insulatedBoxCount} caixa(s) térmica(s). Estas caixas têm custo adicional.`);
  }

  return suggestions;
}
```

2. **Relatórios de Uso**: O serviço pode gerar relatórios de uso de embalagens para análise e otimização contínua.

```typescript
public generatePackagingReport(period: { start: Date; end: Date }, packagingResults: PackagingResult[]): any {
  const totalOrders = packagingResults.length;
  const totalBoxesUsed = packagingResults.reduce((sum, result) => sum + result.boxes.length, 0);
  const totalCost = packagingResults.reduce((sum, result) => sum + result.totalCost, 0);
  const averageBoxesPerOrder = totalBoxesUsed / totalOrders;
  const averageCostPerOrder = totalCost / totalOrders;
  const averageEfficiency = packagingResults.reduce((sum, result) => sum + result.packingEfficiency, 0) / totalOrders;

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
    boxTypeCounts
  };
}
```

**Exemplo de Uso**:

```typescript
// Obter instância do serviço
const packagingService = PackagingOptimizationService.getInstance();

// Configurar o serviço com opções personalizadas
packagingService.configure({
  prioritizeCost: true,
  maxWastedSpace: 25,
  allowMultipleBoxes: true,
  considerFragility: true,
  considerRefrigeration: true,
  maxBoxesPerOrder: 3,
});

// Criar produtos para um pedido
const products = [
  {
    productId: 'bolo-chocolate',
    dimensions: { width: 20, height: 10, length: 20 },
    weight: 800,
    isFragile: true,
    requiresRefrigeration: false,
    quantity: 1,
  },
  {
    productId: 'cupcakes',
    dimensions: { width: 5, height: 5, length: 5 },
    weight: 100,
    isFragile: true,
    requiresRefrigeration: false,
    quantity: 6,
  },
];

// Calcular a melhor combinação de embalagens
const result = packagingService.optimizePackaging(products);

// Exibir resultados
console.log(`Número de caixas: ${result.boxes.length}`);
console.log(`Custo total: R$${result.totalCost.toFixed(2)}`);
console.log(`Eficiência: ${result.packingEfficiency.toFixed(2)}%`);
```

### 9. Cache LRU (Least Recently Used)

**Descrição**: Implementação de uma estrutura de dados de cache que mantém um número limitado de itens em memória, descartando automaticamente os itens menos recentemente utilizados quando a capacidade máxima é atingida. Inclui funcionalidades de expiração baseada em tempo.

**Complexidade**:

- Temporal:
  - Acesso (get/set/delete): O(1) - tempo constante para operações de acesso
  - Evicção (remoção do item menos usado): O(n) - onde n é o número de itens no cache
- Espacial: O(n) - para armazenar os itens do cache e metadados associados

**Benefícios**:

- Melhoria significativa de desempenho para dados acessados frequentemente
- Redução de carga em bancos de dados e APIs externas
- Gerenciamento automático de memória com limite configurável
- Expiração automática de dados baseada em tempo
- Implementação genérica que pode ser usada para qualquer tipo de dado

#### Implementação Detalhada

**Estrutura de Dados**:

A implementação utiliza três `Map`s internos para gerenciar os dados e metadados:

```typescript
export class LRUCache<K, V> {
  private capacity: number; // Capacidade máxima do cache
  private cache: Map<K, V>; // Armazena os valores do cache
  private keyTimestamps: Map<K, number>; // Registra quando cada chave foi acessada
  private keyExpirations: Map<K, number>; // Armazena os tempos de expiração

  constructor(capacity: number = 100) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
    this.keyTimestamps = new Map<K, number>();
    this.keyExpirations = new Map<K, number>();
  }

  // Métodos da classe...
}
```

**Algoritmo de Acesso e Evicção**:

O algoritmo LRU (Least Recently Used) funciona da seguinte forma:

1. **Acesso a um item (get)**:
   - Verifica se o item existe no cache
   - Verifica se o item não expirou
   - Atualiza o timestamp do item para marcar como recentemente usado
   - Retorna o valor ou undefined se não existir ou estiver expirado

```typescript
get(key: K): V | undefined {
  if (!this.cache.has(key)) {
    return undefined;
  }

  // Verificar expiração
  const expirationTime = this.keyExpirations.get(key);
  const now = Date.now();

  if (expirationTime && now > expirationTime) {
    this.delete(key);
    return undefined;
  }

  // Atualizar timestamp para marcar como recentemente usado
  this.keyTimestamps.set(key, now);
  return this.cache.get(key);
}
```

2. **Adição de um item (set)**:
   - Se o cache estiver cheio, remove o item menos recentemente usado
   - Armazena o valor e atualiza o timestamp
   - Define o tempo de expiração, se fornecido

```typescript
set(key: K, value: V, expirationMinutes?: number): void {
  // Se o cache estiver cheio e a chave não existir, remover o item menos recentemente usado
  if (this.cache.size >= this.capacity && !this.cache.has(key)) {
    this.evictLRU();
  }

  // Armazenar o valor e atualizar o timestamp
  this.cache.set(key, value);
  this.keyTimestamps.set(key, Date.now());

  // Definir expiração se fornecida
  if (expirationMinutes !== undefined) {
    const expirationTime = Date.now() + (expirationMinutes * 60 * 1000);
    this.keyExpirations.set(key, expirationTime);
  } else {
    this.keyExpirations.delete(key); // Remover expiração se existir
  }
}
```

3. **Evicção do item menos recentemente usado**:
   - Encontra a chave com o timestamp mais antigo
   - Remove o item do cache

```typescript
private evictLRU(): void {
  if (this.cache.size === 0) return;

  let oldestKey: K | null = null;
  let oldestTimestamp = Infinity;

  // Encontrar a chave com o timestamp mais antigo
  for (const [key, timestamp] of this.keyTimestamps.entries()) {
    if (timestamp < oldestTimestamp) {
      oldestTimestamp = timestamp;
      oldestKey = key;
    }
  }

  // Remover o item mais antigo
  if (oldestKey !== null) {
    this.delete(oldestKey);
  }
}
```

**Funcionalidades Adicionais**:

1. **Expiração baseada em tempo**: Permite definir um tempo de vida para cada item no cache.

2. **Limpeza de itens expirados**: Método para remover todos os itens expirados do cache.

```typescript
purgeExpired(): number {
  const now = Date.now();
  let count = 0;

  for (const [key, expirationTime] of this.keyExpirations.entries()) {
    if (now > expirationTime) {
      this.delete(key);
      count++;
    }
  }

  return count;
}
```

**Exemplo de Uso**:

```typescript
// Criar um cache com capacidade para 100 itens
const cache = new LRUCache<string, any>(100);

// Armazenar um valor no cache por 30 minutos
cache.set('user:123', { name: 'João', email: 'joao@exemplo.com' }, 30);

// Recuperar um valor do cache
const userData = cache.get('user:123');
if (userData) {
  console.log(`Usuário encontrado no cache: ${userData.name}`);
} else {
  console.log('Usuário não encontrado no cache ou expirado');
}

// Limpar itens expirados
const removedCount = cache.purgeExpired();
console.log(`${removedCount} itens expirados foram removidos do cache`);
```

## Algoritmos Sugeridos para Implementação Futura

1. **Sistema de Fidelidade Inteligente**: Algoritmo que personaliza recompensas e benefícios com base no comportamento e valor do cliente.

2. **Busca Avançada com Indexação e Relevância**: Sistema de busca que utiliza técnicas de processamento de linguagem natural para melhorar a relevância dos resultados.
