export interface Store {
  id: string;
  producerId: string;
  
  // IDENTIDADE
  name: string;
  description?: string; // bio
  logo?: string;
  banner?: string;
  gallery?: string[]; // Galeria de fotos da loja/confeitaria
  producerPhoto?: string;
  
  // AUTORIDADE
  rating?: number;
  totalOrders?: number;
  specialties?: string[];
  averageResponseTime?: number; // em minutos
  isVerified?: boolean; // Selo de verificação da plataforma
  
  // SOCIAL E REVIEWS
  socialLinks?: {
    instagram?: string;
    whatsapp?: string;
    website?: string;
  };
  reviewSummary?: {
    averageRating: number;
    totalReviews: number;
  };
  
  // COMERCIAL
  isOpen: boolean;
  businessHours: {
    [dayOfWeek: number]: { // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
      open: string; // ex: "08:00"
      close: string; // ex: "18:00"
      isClosed: boolean;
      pauseStart?: string; // ex: "12:00"
      pauseEnd?: string;   // ex: "13:00"
    }
  };
  holidays?: string[]; // Formato "YYYY-MM-DD"
  leadTime: number; // Tempo de preparo padrão em minutos
  cutoffTime?: string; // Horário limite para aceitar pedidos no mesmo dia (ex: "16:00")
  deliveryRadius?: number; // em km
  minimumOrderValue?: number;
  deliveryFee?: number;
  acceptedPaymentMethods?: string[]; // ex: ['pix', 'credit_card', 'cash']
}
