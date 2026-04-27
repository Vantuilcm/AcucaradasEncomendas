export interface Review {
  id: string;
  userId: string;
  orderId: string;
  userName?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  date?: string;
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

export interface ReviewFormData {
  rating: number;
  comment: string;
  images?: string[];
}
