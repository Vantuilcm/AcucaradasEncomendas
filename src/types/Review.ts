export interface Review {
  id: string;
  userId: string;
  orderId: string;
  rating: number; // Avaliação do pedido/produtos
  driverRating?: number; // Avaliação do entregador
  comment: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
  likes?: number;
  isVerified?: boolean;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number; // 1-5 estrelas
  };
}

export interface ReviewFilters {
  rating?: number;
  verified?: boolean;
  hasImages?: boolean;
  sortBy?: 'newest' | 'highest' | 'lowest' | 'mostLiked';
}
