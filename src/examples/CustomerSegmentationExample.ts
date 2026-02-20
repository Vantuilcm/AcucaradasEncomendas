/**
 * Exemplo de uso do Serviço de Segmentação de Clientes
 *
 * Este exemplo demonstra como utilizar o serviço de segmentação de clientes
 * para analisar o comportamento de compra, segmentar clientes e gerar
 * insights para estratégias de marketing personalizadas.
 */

import {
  customerSegmentationService,
  CustomerPurchaseData,
  CustomerSegment,
  SegmentationConfig,
} from '../services/CustomerSegmentationService';

// Exemplo de dados de pedidos para alguns clientes
const mockOrdersData = {
  // Cliente VIP
  customer1: [
    {
      id: 'order1',
      customerId: 'customer1',
      totalAmount: 350,
      createdAt: new Date('2023-05-15'),
      items: [
        { productId: 'product1', category: 'bolos', quantity: 2, price: 150 },
        { productId: 'product3', category: 'doces', quantity: 1, price: 50 },
      ],
    },
    {
      id: 'order2',
      customerId: 'customer1',
      totalAmount: 450,
      createdAt: new Date('2023-06-20'),
      items: [
        { productId: 'product2', category: 'bolos', quantity: 1, price: 200 },
        { productId: 'product4', category: 'salgados', quantity: 5, price: 50 },
      ],
    },
    {
      id: 'order3',
      customerId: 'customer1',
      totalAmount: 300,
      createdAt: new Date('2023-07-10'),
      items: [{ productId: 'product1', category: 'bolos', quantity: 2, price: 150 }],
    },
    {
      id: 'order4',
      customerId: 'customer1',
      totalAmount: 500,
      createdAt: new Date('2023-08-05'),
      items: [
        { productId: 'product5', category: 'tortas', quantity: 1, price: 300 },
        { productId: 'product3', category: 'doces', quantity: 4, price: 50 },
      ],
    },
  ],

  // Cliente Frequente
  customer2: [
    {
      id: 'order5',
      customerId: 'customer2',
      totalAmount: 100,
      createdAt: new Date('2023-06-01'),
      items: [{ productId: 'product3', category: 'doces', quantity: 2, price: 50 }],
    },
    {
      id: 'order6',
      customerId: 'customer2',
      totalAmount: 120,
      createdAt: new Date('2023-06-15'),
      items: [{ productId: 'product4', category: 'salgados', quantity: 2, price: 60 }],
    },
    {
      id: 'order7',
      customerId: 'customer2',
      totalAmount: 150,
      createdAt: new Date('2023-07-01'),
      items: [{ productId: 'product3', category: 'doces', quantity: 3, price: 50 }],
    },
    {
      id: 'order8',
      customerId: 'customer2',
      totalAmount: 80,
      createdAt: new Date('2023-07-20'),
      items: [{ productId: 'product6', category: 'bebidas', quantity: 2, price: 40 }],
    },
    {
      id: 'order9',
      customerId: 'customer2',
      totalAmount: 110,
      createdAt: new Date('2023-08-10'),
      items: [
        { productId: 'product4', category: 'salgados', quantity: 1, price: 60 },
        { productId: 'product6', category: 'bebidas', quantity: 1, price: 50 },
      ],
    },
  ],

  // Cliente Ocasional
  customer3: [
    {
      id: 'order10',
      customerId: 'customer3',
      totalAmount: 200,
      createdAt: new Date('2023-04-10'),
      items: [{ productId: 'product2', category: 'bolos', quantity: 1, price: 200 }],
    },
    {
      id: 'order11',
      customerId: 'customer3',
      totalAmount: 150,
      createdAt: new Date('2023-07-15'),
      items: [{ productId: 'product1', category: 'bolos', quantity: 1, price: 150 }],
    },
  ],

  // Cliente em Risco
  customer4: [
    {
      id: 'order12',
      customerId: 'customer4',
      totalAmount: 350,
      createdAt: new Date('2023-01-20'),
      items: [
        { productId: 'product5', category: 'tortas', quantity: 1, price: 300 },
        { productId: 'product6', category: 'bebidas', quantity: 1, price: 50 },
      ],
    },
    {
      id: 'order13',
      customerId: 'customer4',
      totalAmount: 250,
      createdAt: new Date('2023-02-15'),
      items: [
        { productId: 'product2', category: 'bolos', quantity: 1, price: 200 },
        { productId: 'product6', category: 'bebidas', quantity: 1, price: 50 },
      ],
    },
  ],

  // Novo Cliente
  customer5: [
    {
      id: 'order14',
      customerId: 'customer5',
      totalAmount: 180,
      createdAt: new Date('2023-08-01'),
      items: [
        { productId: 'product1', category: 'bolos', quantity: 1, price: 150 },
        { productId: 'product6', category: 'bebidas', quantity: 1, price: 30 },
      ],
    },
  ],
};

/**
 * Função principal do exemplo
 */
export function runCustomerSegmentationExample() {
  console.log('=== Exemplo de Segmentação de Clientes ===');

  // 1. Configurar o serviço
  console.log('\n1. Configurando o serviço de segmentação...');
  const customConfig: Partial<SegmentationConfig> = {
    recencyWeight: 0.4,
    frequencyWeight: 0.3,
    monetaryWeight: 0.3,
    recencyThresholds: [15, 60, 120], // dias
    frequencyThresholds: [2, 4, 6], // pedidos
    monetaryThresholds: [150, 300, 600], // reais
  };
  customerSegmentationService.updateConfig(customConfig);
  console.log('Configuração atualizada com sucesso!');

  // 2. Processar dados dos clientes
  console.log('\n2. Processando dados de compra dos clientes...');
  const customerData: { [id: string]: CustomerPurchaseData } = {};

  for (const [customerId, orders] of Object.entries(mockOrdersData)) {
    customerData[customerId] = customerSegmentationService.processCustomerData(customerId, orders);
    console.log(`Cliente ${customerId} processado:`);
    console.log(`  - Total gasto: R$ ${customerData[customerId].totalSpent.toFixed(2)}`);
    console.log(`  - Número de pedidos: ${customerData[customerId].orderCount}`);
    console.log(
      `  - Valor médio por pedido: R$ ${customerData[customerId].averageOrderValue.toFixed(2)}`
    );
    console.log(
      `  - Última compra: ${customerData[customerId].lastPurchaseDate.toLocaleDateString()}`
    );
    console.log(
      `  - Frequência de compra: ${customerData[customerId].purchaseFrequency.toFixed(1)} dias`
    );

    // Mostrar categorias preferidas
    const categories = Object.entries(customerData[customerId].categories)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat} (${count})`)
      .join(', ');
    console.log(`  - Categorias: ${categories}`);
  }

  // 3. Segmentar clientes
  console.log('\n3. Segmentando clientes usando modelo RFM...');
  customerSegmentationService.segmentCustomersRFM();

  // 4. Exibir resultados da segmentação
  console.log('\n4. Resultados da segmentação:');
  const segments = customerSegmentationService.getAllSegments();

  segments.forEach(segment => {
    if (segment.customers.length > 0) {
      console.log(`\nSegmento: ${segment.name} (${segment.customers.length} clientes)`);
      console.log(`Descrição: ${segment.description}`);
      console.log('Características:');
      segment.characteristics.forEach(char => console.log(`  - ${char}`));
      console.log('Clientes no segmento:');
      segment.customers.forEach(customerId => {
        const data = customerData[customerId];
        console.log(
          `  - Cliente ${customerId}: R$ ${data.totalSpent.toFixed(2)}, ${data.orderCount} pedidos, última compra em ${data.lastPurchaseDate.toLocaleDateString()}`
        );
      });

      // Mostrar estratégias de marketing recomendadas
      console.log('Estratégias de marketing recomendadas:');
      const strategies = customerSegmentationService.generateMarketingRecommendations(segment.id);
      strategies.forEach(strategy => console.log(`  - ${strategy}`));
    }
  });

  // 5. Análise de clientes similares
  console.log('\n5. Análise de clientes similares:');
  const targetCustomerId = 'customer1';
  const similarCustomers = customerSegmentationService.findSimilarCustomers(targetCustomerId, 3);

  console.log(`Clientes similares ao cliente ${targetCustomerId}:`);
  similarCustomers.forEach(customerId => {
    const data = customerData[customerId];
    console.log(
      `  - Cliente ${customerId}: R$ ${data.totalSpent.toFixed(2)}, ${data.orderCount} pedidos, última compra em ${data.lastPurchaseDate.toLocaleDateString()}`
    );
  });

  // 6. Análise de categorias preferidas
  console.log('\n6. Análise de categorias preferidas:');
  for (const customerId of Object.keys(customerData)) {
    const preferredCategories =
      customerSegmentationService.getCustomerPreferredCategories(customerId);
    console.log(
      `Cliente ${customerId} - Categorias preferidas: ${preferredCategories.join(', ') || 'Nenhuma categoria preferida identificada'}`
    );
  }

  // 7. Cálculo de LTV (Lifetime Value)
  console.log('\n7. Cálculo de Valor do Tempo de Vida (LTV):');
  for (const customerId of Object.keys(customerData)) {
    const ltv = customerSegmentationService.calculateCustomerLTV(customerId);
    console.log(`Cliente ${customerId} - LTV estimado: R$ ${ltv.toFixed(2)}`);
  }

  console.log('\n=== Fim do Exemplo de Segmentação de Clientes ===');
}

// Executar o exemplo se este arquivo for executado diretamente
if (require.main === module) {
  runCustomerSegmentationExample();
}
