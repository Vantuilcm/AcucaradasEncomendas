/**
 * Exemplo de uso do Serviço de Otimização de Embalagens
 *
 * Este exemplo demonstra como utilizar o serviço para calcular a melhor
 * combinação de embalagens para um pedido, minimizando custos e desperdício.
 */

import {
  PackagingOptimizationService,
  ProductPackagingInfo,
  PackagingResult,
  PackagingOptimizationConfig,
} from '../services/PackagingOptimizationService';

// Função principal do exemplo
function runPackagingOptimizationExample() {
  console.log('=== Exemplo de Otimização de Embalagens ===');

  // Obter instância do serviço
  const packagingService = PackagingOptimizationService.getInstance();

  // Configurar o serviço com opções personalizadas
  const customConfig: PackagingOptimizationConfig = {
    prioritizeCost: true,
    maxWastedSpace: 25, // Reduzir o espaço desperdiçado máximo para 25%
    allowMultipleBoxes: true,
    considerFragility: true,
    considerRefrigeration: true,
    maxBoxesPerOrder: 3,
  };

  packagingService.configure(customConfig);
  console.log('Serviço configurado com opções personalizadas.');

  // Listar embalagens disponíveis
  const availableBoxes = packagingService.getAvailableBoxes();
  console.log(`\nEmbalagens disponíveis (${availableBoxes.length}):`);
  availableBoxes.forEach(box => {
    console.log(
      `- ${box.name}: ${box.dimensions.width}x${box.dimensions.height}x${box.dimensions.length}cm, Custo: R$${box.cost.toFixed(2)}`
    );
  });

  // Criar produtos para um pedido de exemplo
  const products: ProductPackagingInfo[] = [
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
    {
      productId: 'torta-morango',
      dimensions: { width: 25, height: 8, length: 25 },
      weight: 1200,
      isFragile: true,
      requiresRefrigeration: true,
      quantity: 1,
    },
    {
      productId: 'cookies',
      dimensions: { width: 10, height: 3, length: 10 },
      weight: 300,
      isFragile: false,
      requiresRefrigeration: false,
      quantity: 2,
    },
  ];

  console.log('\nProdutos do pedido:');
  products.forEach(product => {
    console.log(
      `- Produto ${product.productId}: ${product.dimensions.width}x${product.dimensions.height}x${product.dimensions.length}cm, ${product.weight}g, Quantidade: ${product.quantity}`
    );
  });

  // Calcular a melhor combinação de embalagens
  console.log('\nCalculando a melhor combinação de embalagens...');
  const result = packagingService.optimizePackaging(products);

  // Exibir resultados
  displayPackagingResults(result);

  // Obter sugestões de melhoria
  const suggestions = packagingService.suggestPackagingImprovements(result);
  if (suggestions.length > 0) {
    console.log('\nSugestões para melhorar a eficiência de embalagem:');
    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });
  }

  // Exemplo com configuração diferente
  console.log('\n=== Testando com configuração alternativa ===');
  packagingService.configure({
    prioritizeCost: false, // Priorizar eficiência sobre custo
    maxWastedSpace: 15, // Reduzir ainda mais o espaço desperdiçado
    maxBoxesPerOrder: 5, // Permitir mais caixas por pedido
  });

  const alternativeResult = packagingService.optimizePackaging(products);
  displayPackagingResults(alternativeResult);

  // Comparar resultados
  console.log('\n=== Comparação de resultados ===');
  console.log(
    `Configuração original: R$${result.totalCost.toFixed(2)}, Eficiência: ${result.packingEfficiency.toFixed(2)}%, ${result.boxes.length} caixa(s)`
  );
  console.log(
    `Configuração alternativa: R$${alternativeResult.totalCost.toFixed(2)}, Eficiência: ${alternativeResult.packingEfficiency.toFixed(2)}%, ${alternativeResult.boxes.length} caixa(s)`
  );

  // Estimar custo de embalagem para pedidos futuros
  const estimatedCost = packagingService.estimatePackagingCost(products);
  console.log(
    `\nCusto estimado de embalagem para pedidos similares: R$${estimatedCost.toFixed(2)}`
  );

  console.log('\n=== Fim do exemplo de Otimização de Embalagens ===');
}

// Função auxiliar para exibir os resultados da otimização
function displayPackagingResults(result: PackagingResult) {
  if (result.boxes.length === 0) {
    console.log('Não foi possível encontrar uma combinação de embalagens para todos os produtos.');
    return;
  }

  console.log(`\nResultado da otimização:`);
  console.log(`- Número de caixas utilizadas: ${result.boxes.length}`);
  console.log(`- Custo total de embalagens: R$${result.totalCost.toFixed(2)}`);
  console.log(`- Eficiência de empacotamento: ${result.packingEfficiency.toFixed(2)}%`);
  console.log(`- Espaço desperdiçado: ${result.wastedSpace.toFixed(2)}%`);

  console.log('\nDistribuição de produtos por caixa:');
  result.boxAssignments.forEach((products, boxId) => {
    const box = result.boxes.find(b => b.id === boxId);
    if (box) {
      console.log(`- Caixa ${box.name}:`);
      products.forEach(product => {
        console.log(`  * Produto ${product.productId}, ${product.weight}g`);
      });
    }
  });
}

// Executar o exemplo
runPackagingOptimizationExample();
