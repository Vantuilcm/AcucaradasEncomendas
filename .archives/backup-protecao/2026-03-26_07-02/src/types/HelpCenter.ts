export type HelpCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type HelpArticle = {
  id: string;
  title: string;
  content: string;
  category: HelpCategory;
  tags: string[];
  updatedAt: string;
};

export type HelpContact = {
  id: string;
  type: 'email' | 'phone' | 'whatsapp';
  label: string;
  description: string;
  value: string;
  isAvailable: boolean;
};
