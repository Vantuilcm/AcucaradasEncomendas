import { Address } from './Delivery';

export interface Producer {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  cnpj?: string;
  cpf?: string;
  logoUrl?: string;
  bannerUrl?: string;
  address: Address;
  stripeAccountId?: string;
  rating?: number;
  totalSales?: number;
  storeImageUrl?: string;
  brandImageUrl?: string;
  isActive: boolean;
  status: 'pending' | 'active' | 'inactive' | 'blocked';
  availability?: {
    workingDays: number[]; // 0-6 (Domingo-Sábado)
    workingHours: {
      start: string; // HH:mm
      end: string;   // HH:mm
    };
    holidays?: string[]; // ISO dates
  };
  schedulingConfig?: {
    maxDaysInAdvance: number; // Padrão 30
    minLeadTimeHours: number; // Tempo mínimo de antecedência
    slotIntervalMinutes: number; // Intervalo entre janelas (ex: 60, 120)
    allowSpecificTime: boolean; // Permitir horário exato ou apenas janelas
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProducerUpdate {
  name?: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  cpf?: string;
  logoUrl?: string;
  bannerUrl?: string;
  brandImageUrl?: string;
  address?: Partial<Address>;
  stripeAccountId?: string;
  isActive?: boolean;
  status?: 'pending' | 'active' | 'inactive' | 'blocked';
  availability?: Producer['availability'];
  schedulingConfig?: Producer['schedulingConfig'];
}
