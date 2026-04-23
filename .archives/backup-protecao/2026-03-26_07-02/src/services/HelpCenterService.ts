import { HelpArticle, HelpCategory, HelpContact } from '../types/HelpCenter';

const categories: HelpCategory[] = [
  {
    id: 'orders',
    name: 'Pedidos',
    description: 'Acompanhe e gerencie seus pedidos',
    icon: 'cart',
  },
  {
    id: 'delivery',
    name: 'Entregas',
    description: 'Informações sobre entregas e rastreamento',
    icon: 'truck',
  },
  {
    id: 'payments',
    name: 'Pagamentos',
    description: 'Cartões, Pix e reembolsos',
    icon: 'credit-card',
  },
  {
    id: 'account',
    name: 'Conta',
    description: 'Perfil, segurança e preferências',
    icon: 'account',
  },
];

const articles: HelpArticle[] = [
  {
    id: 'orders-1',
    title: 'Como acompanhar meu pedido',
    content:
      'Você pode acompanhar seu pedido na tela de pedidos e ver o status atualizado em tempo real.',
    category: categories[0],
    tags: ['pedido', 'status'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'delivery-1',
    title: 'Prazos de entrega',
    content:
      'Os prazos variam conforme a distância e disponibilidade do entregador. O app mostra a estimativa.',
    category: categories[1],
    tags: ['entrega', 'prazo'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'payments-1',
    title: 'Formas de pagamento',
    content: 'Aceitamos cartão de crédito, débito e Pix.',
    category: categories[2],
    tags: ['pagamento', 'pix'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'account-1',
    title: 'Como atualizar meu perfil',
    content: 'Acesse Configurações > Perfil para editar seus dados.',
    category: categories[3],
    tags: ['perfil', 'conta'],
    updatedAt: new Date().toISOString(),
  },
];

const contacts: HelpContact[] = [
  {
    id: 'support-email',
    type: 'email',
    label: 'E-mail de suporte',
    description: 'Atendimento de segunda a sexta',
    value: 'suporte@acucaradas.com.br',
    isAvailable: true,
  },
  {
    id: 'support-whatsapp',
    type: 'whatsapp',
    label: 'WhatsApp',
    description: 'Respostas rápidas no horário comercial',
    value: '+55 11 99999-9999',
    isAvailable: true,
  },
  {
    id: 'support-phone',
    type: 'phone',
    label: 'Telefone',
    description: 'Central de atendimento',
    value: '+55 11 4000-0000',
    isAvailable: false,
  },
];

export class HelpCenterService {
  async getCategories(): Promise<HelpCategory[]> {
    return categories;
  }

  async getContactInfo(): Promise<HelpContact[]> {
    return contacts;
  }

  async getArticlesByCategory(categoryId: string): Promise<HelpArticle[]> {
    return articles.filter(article => article.category.id === categoryId);
  }

  async getArticleById(articleId: string): Promise<HelpArticle | null> {
    return articles.find(article => article.id === articleId) ?? null;
  }

  async searchArticles(query: string): Promise<{
    articles: HelpArticle[];
    categories: HelpCategory[];
    total: number;
  }> {
    const normalizedQuery = query.trim().toLowerCase();
    const matchedArticles = articles.filter(article =>
      [article.title, article.content, ...article.tags]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
    const matchedCategories = categories.filter(category =>
      [category.name, category.description].join(' ').toLowerCase().includes(normalizedQuery)
    );

    return {
      articles: matchedArticles,
      categories: matchedCategories,
      total: matchedArticles.length + matchedCategories.length,
    };
  }
}
