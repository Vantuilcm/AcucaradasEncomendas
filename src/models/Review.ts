export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number; // 1 a 5
  comment: string;
  date: string;
  likes?: number;
  isHelpful?: boolean;
}

// Tipo para formulário de envio de nova avaliação
export interface ReviewFormData {
  rating: number;
  comment: string;
}

// Tipo para resposta da API com média e total
export interface ProductReviewStats {
  productId: string;
  averageRating: number;
  totalReviews: number;
}

// Para enviar a API
export interface ReviewSubmitData {
  productId: string;
  rating: number;
  comment: string;
}
