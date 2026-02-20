export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: HelpCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  articles: HelpArticle[];
}

export interface HelpSearchResult {
  articles: HelpArticle[];
  categories: HelpCategory[];
  total: number;
}

export interface HelpContact {
  id: string;
  type: 'email' | 'phone' | 'whatsapp';
  value: string;
  label: string;
  description: string;
  isAvailable: boolean;
  availableHours?: {
    start: string; // formato HH:mm
    end: string; // formato HH:mm
    days: number[]; // 0-6 (Domingo-Sábado)
  };
}
