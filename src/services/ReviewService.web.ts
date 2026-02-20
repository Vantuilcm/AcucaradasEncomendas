import { Review, ReviewFilters, ReviewSummary } from '../types/Review';
import { loggingService } from './LoggingService.web';

// Versão web do ReviewService sem dependência do Firebase.
// Usa um armazenamento em memória apenas para desenvolvimento/preview.
export class ReviewService {
  private static instance: ReviewService;
  private store: Review[] = [];
  private readonly pageSize = 10;

  private constructor() {
    // Popular com alguns dados de exemplo para preview
    this.store = Array.from({ length: 12 }).map((_, i) => ({
      id: `rev_${i + 1}`,
      userId: `user_${(i % 3) + 1}`,
      orderId: `order_${(i % 4) + 1}`,
      rating: (i % 5) + 1,
      comment: `Comentário de avaliação #${i + 1}`,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
      images: i % 2 === 0 ? [`https://picsum.photos/seed/${i}/200/200`] : [],
      likes: Math.floor(Math.random() * 50),
      isVerified: i % 2 === 0,
    }));
  }

  public static getInstance(): ReviewService {
    if (!ReviewService.instance) {
      ReviewService.instance = new ReviewService();
    }
    return ReviewService.instance;
  }

  async getReviews(filters?: ReviewFilters, lastReview?: Review): Promise<Review[]> {
    try {
      let items = [...this.store].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (lastReview) {
        const lastIndex = items.findIndex(r => r.id === lastReview.id);
        items = lastIndex >= 0 ? items.slice(lastIndex + 1) : items;
      }

      const page = items.slice(0, this.pageSize);
      return this.applyFilters(page, filters);
    } catch (error) {
      loggingService.error('Erro (web) ao buscar avaliações', error as Error);
      throw error;
    }
  }

  async getReviewById(reviewId: string): Promise<Review | null> {
    try {
      const review = this.store.find(r => r.id === reviewId) || null;
      return review;
    } catch (error) {
      loggingService.error('Erro (web) ao buscar avaliação', error as Error, { reviewId });
      throw error;
    }
  }

  async getReviewsByOrder(orderId: string): Promise<Review[]> {
    try {
      const reviews = this.store
        .filter(r => r.orderId === orderId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return reviews;
    } catch (error) {
      loggingService.error('Erro (web) ao buscar avaliações do pedido', error as Error, { orderId });
      throw error;
    }
  }

  async getReviewSummary(): Promise<ReviewSummary> {
    try {
      const reviews = [...this.store];
      const totalReviews = reviews.length;
      const averageRating =
        totalReviews > 0
          ? reviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews
          : 0;

      const ratingDistribution: ReviewSummary['ratingDistribution'] = {
        1: reviews.filter(r => r.rating === 1).length,
        2: reviews.filter(r => r.rating === 2).length,
        3: reviews.filter(r => r.rating === 3).length,
        4: reviews.filter(r => r.rating === 4).length,
        5: reviews.filter(r => r.rating === 5).length,
      };

      return {
        averageRating,
        totalReviews,
        ratingDistribution,
      };
    } catch (error) {
      loggingService.error('Erro (web) ao buscar resumo de avaliações', error as Error);
      throw error;
    }
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    try {
      const now = new Date().toISOString();
      const newReview: Review = {
        id: `rev_${this.store.length + 1}`,
        ...review,
        createdAt: now,
        updatedAt: now,
      };
      this.store.unshift(newReview);
      loggingService.info('Avaliação (web) criada com sucesso', { reviewId: newReview.id });
      return newReview;
    } catch (error) {
      loggingService.error('Erro (web) ao criar avaliação', error as Error);
      throw error;
    }
  }

  async updateReview(reviewId: string, updates: Partial<Review>): Promise<void> {
    try {
      const idx = this.store.findIndex(r => r.id === reviewId);
      if (idx >= 0) {
        this.store[idx] = {
          ...this.store[idx],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      loggingService.info('Avaliação (web) atualizada com sucesso', { reviewId });
    } catch (error) {
      loggingService.error('Erro (web) ao atualizar avaliação', error as Error, { reviewId });
      throw error;
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      this.store = this.store.filter(r => r.id !== reviewId);
      loggingService.info('Avaliação (web) excluída com sucesso', { reviewId });
    } catch (error) {
      loggingService.error('Erro (web) ao excluir avaliação', error as Error, { reviewId });
      throw error;
    }
  }

  async likeReview(reviewId: string): Promise<void> {
    try {
      const idx = this.store.findIndex(r => r.id === reviewId);
      if (idx >= 0) {
        const likes = this.store[idx].likes || 0;
        this.store[idx].likes = likes + 1;
      }
      loggingService.info('Avaliação (web) curtida com sucesso', { reviewId });
    } catch (error) {
      loggingService.error('Erro (web) ao curtir avaliação', error as Error, { reviewId });
      throw error;
    }
  }

  private applyFilters(reviews: Review[], filters?: ReviewFilters): Review[] {
    if (!filters) return reviews;

    let out = reviews;
    if (filters.rating) {
      out = out.filter(r => r.rating === filters.rating);
    }
    if (filters.verified !== undefined) {
      out = out.filter(r => !!r.isVerified === !!filters.verified);
    }
    if (filters.hasImages !== undefined) {
      out = out.filter(r => (r.images && r.images.length > 0) === !!filters.hasImages);
    }
    switch (filters.sortBy) {
      case 'highest':
        out = out.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        out = out.sort((a, b) => a.rating - b.rating);
        break;
      case 'mostLiked':
        out = out.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'newest':
      default:
        out = out.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    return out;
  }
}

export const reviewService = ReviewService.getInstance();