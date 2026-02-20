import { HelpArticle, HelpCategory, HelpContact, HelpSearchResult } from '../types/HelpCenter';

// Simple in-memory data to support the Help Center screens.
// In a real app, these would be fetched from Firestore or an API.
const mockCategories: HelpCategory[] = [
  {
    id: 'orders',
    name: 'Pedidos',
    description: 'Ajuda com seus pedidos, entregas e acompanhamento',
    icon: 'clipboard-text',
    articles: [],
  },
  {
    id: 'payments',
    name: 'Pagamentos',
    description: 'Formas de pagamento, reembolsos e cobranças',
    icon: 'credit-card',
    articles: [],
  },
  {
    id: 'account',
    name: 'Conta',
    description: 'Configurações de conta e segurança',
    icon: 'account-circle',
    articles: [],
  },
];

const mockArticles: HelpArticle[] = [
  {
    id: 'track-order',
    title: 'Como acompanhar meu pedido?',
    content:
      'Você pode acompanhar o status do seu pedido pela tela de "Pedidos". Lá verá atualizações em tempo real como Em preparação, A caminho e Entregue.',
    category: mockCategories[0],
    tags: ['pedido', 'entrega', 'rastreamento'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'refunds',
    title: 'Como solicitar reembolso?',
    content:
      'Caso tenha algum problema com seu pedido, acesse a central de ajuda e entre em contato. Avaliaremos seu caso e, se for elegível, processaremos o reembolso.',
    category: mockCategories[1],
    tags: ['pagamento', 'reembolso'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2fa',
    title: 'Como ativar a autenticação em duas etapas (2FA)?',
    content:
      'A autenticação em duas etapas pode ser ativada nas configurações da conta para aumentar sua segurança.',
    category: mockCategories[2],
    tags: ['segurança', 'conta', '2fa'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Attach articles to categories
mockCategories.forEach(cat => {
  cat.articles = mockArticles.filter(a => a.category.id === cat.id);
});

const mockContacts: HelpContact[] = [
  {
    id: 'email',
    type: 'email',
    value: 'suporte@acucaradasencomendas.com.br',
    label: 'E-mail de suporte',
    description: 'Nosso time responde em até 24h',
    isAvailable: true,
  },
  {
    id: 'phone',
    type: 'phone',
    value: '(11) 4002-8922',
    label: 'Telefone',
    description: 'Atendimento de seg a sex, das 9h às 18h',
    isAvailable: true,
    availableHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
  },
  {
    id: 'whatsapp',
    type: 'whatsapp',
    value: '(11) 90000-0000',
    label: 'WhatsApp',
    description: 'Respostas rápidas via chat',
    isAvailable: false,
  },
];

export class HelpCenterService {
  async getCategories(): Promise<HelpCategory[]> {
    // Simulate async fetch
    return Promise.resolve(mockCategories);
  }

  async getContactInfo(): Promise<HelpContact[]> {
    return Promise.resolve(mockContacts);
  }

  async searchArticles(query: string): Promise<HelpSearchResult> {
    const q = query.trim().toLowerCase();
    const articles = mockArticles.filter(
      a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
    );
    const categories = mockCategories.filter(
      c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
    return {
      articles,
      categories,
      total: articles.length + categories.length,
    };
  }

  async getArticlesByCategory(categoryId: string): Promise<HelpArticle[]> {
    return Promise.resolve(mockArticles.filter(a => a.category.id === categoryId));
  }

  async getArticleById(articleId: string): Promise<HelpArticle | null> {
    return Promise.resolve(mockArticles.find(a => a.id === articleId) ?? null);
  }
}

export default HelpCenterService;
