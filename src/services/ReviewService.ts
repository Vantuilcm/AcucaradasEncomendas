import { db, f } from '../config/firebase';
import { Review, ReviewFilters, ReviewSummary } from '../types/Review';
import { loggingService } from './LoggingService';
import { XssSanitizer } from '../utils/XssSanitizer';

export class ReviewService {
  private static instance: ReviewService;
  private readonly collection = 'reviews';
  private readonly pageSize = 10;

  private constructor() {}

  public static getInstance(): ReviewService {
    if (!ReviewService.instance) {
      ReviewService.instance = new ReviewService();
    }
    return ReviewService.instance;
  }

  async getReviews(filters?: ReviewFilters, lastReview?: Review): Promise<Review[]> {
    try {
      const reviewsRef = f.collection(this.collection);
      let q = f.query(reviewsRef, f.orderBy('createdAt', 'desc'), f.limit(this.pageSize));

      if (lastReview) {
        // @ts-ignore
        const { startAfter } = require('firebase/firestore');
        q = f.query(
          reviewsRef,
          f.orderBy('createdAt', 'desc'),
          startAfter(new Date(lastReview.createdAt)),
          f.limit(this.pageSize)
        );
      }

      const querySnapshot = await f.getDocs(q);
      const reviews: Review[] = [];

      for (const doc of querySnapshot.docs) {
        const review = {
          id: doc.id,
          ...doc.data(),
        } as Review;
        reviews.push(review);
      }

      return this.applyFilters(reviews, filters);
    } catch (error) {
      loggingService.error('Erro ao buscar avaliações', {
        filters,
        error,
      });
      throw error;
    }
  }

  async getReviewById(reviewId: string): Promise<Review | null> {
    try {
      const reviewRef = f.doc(this.collection, reviewId);
      const reviewDoc = await f.getDoc(reviewRef);

      if (!reviewDoc.exists()) {
        return null;
      }

      return {
        id: reviewDoc.id,
        ...reviewDoc.data(),
      } as Review;
    } catch (error) {
      loggingService.error('Erro ao buscar avaliação', {
        reviewId,
        error,
      });
      throw error;
    }
  }

  async getReviewsByOrder(orderId: string): Promise<Review[]> {
    try {
      const reviewsRef = f.collection(this.collection);
      const q = f.query(reviewsRef, f.where('orderId', '==', orderId), f.orderBy('createdAt', 'desc'));

      const querySnapshot = await f.getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
    } catch (error) {
      loggingService.error('Erro ao buscar avaliações do pedido', {
        orderId,
        error,
      });
      throw error;
    }
  }

  async getReviewSummary(): Promise<ReviewSummary> {
    try {
      const reviewsRef = f.collection(this.collection);
      const q = f.query(reviewsRef, f.orderBy('createdAt', 'desc'));
      const querySnapshot = await f.getDocs(q);
      const reviews = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];

      const totalReviews = reviews.length;
      const averageRating =
        totalReviews > 0
          ? reviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews
          : 0;

      const ratingDistribution = {
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
      loggingService.error('Erro ao buscar resumo de avaliações', { error });
      throw error;
    }
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    try {
      // Sanitizar o comentário para prevenir XSS
      const sanitizedReview = {
        ...review,
        comment: XssSanitizer.sanitize(review.comment),
      };
      
      const reviewsRef = f.collection(this.collection);
      const docRef = await f.addDoc(reviewsRef, {
        ...sanitizedReview,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newReview: Review = {
        id: docRef.id,
        ...sanitizedReview,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Avaliação criada com sucesso', { reviewId: docRef.id });
      return newReview;
    } catch (error) {
      loggingService.error('Erro ao criar avaliação', { error });
      throw error;
    }
  }

  async updateReview(reviewId: string, updates: Partial<Review>): Promise<void> {
    try {
      // Sanitizar o comentário para prevenir XSS se estiver sendo atualizado
      const sanitizedUpdates = { ...updates };
      if (updates.comment) {
        sanitizedUpdates.comment = XssSanitizer.sanitize(updates.comment);
      }
      
      const reviewRef = f.doc(this.collection, reviewId);
      await f.updateDoc(reviewRef, {
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Avaliação atualizada com sucesso', { reviewId });
    } catch (error) {
      loggingService.error('Erro ao atualizar avaliação', {
        reviewId,
        error,
      });
      throw error;
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = f.doc(this.collection, reviewId);
      await f.deleteDoc(reviewRef);

      loggingService.info('Avaliação excluída com sucesso', { reviewId });
    } catch (error) {
      loggingService.error('Erro ao excluir avaliação', {
        reviewId,
        error,
      });
      throw error;
    }
  }

  async likeReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = f.doc(this.collection, reviewId);
      // @ts-ignore
      const { increment } = require('firebase/firestore');
      await f.updateDoc(reviewRef, {
        likes: increment(1),
      });

      loggingService.info('Avaliação curtida com sucesso', { reviewId });
    } catch (error) {
      loggingService.error('Erro ao curtir avaliação', {
        reviewId,
        error,
      });
      throw error;
    }
  }

  private applyFilters(reviews: Review[], filters?: ReviewFilters): Review[] {
    if (!filters) return reviews;

    return reviews
      .filter(review => {
        // Filtro por avaliação
        if (filters.rating && review.rating !== filters.rating) {
          return false;
        }

        // Filtro por verificação
        if (filters.verified !== undefined && review.isVerified !== filters.verified) {
          return false;
        }

        // Filtro por imagens
        if (filters.hasImages !== undefined) {
          const hasImages = review.images && review.images.length > 0;
          if (filters.hasImages !== hasImages) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (!filters.sortBy) return 0;

        switch (filters.sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'highest':
            return b.rating - a.rating;
          case 'lowest':
            return a.rating - b.rating;
          case 'mostLiked':
            return (b.likes || 0) - (a.likes || 0);
          default:
            return 0;
        }
      });
  }

  /**
   * Obtém todas as avaliações feitas por um usuário específico
   * @param userId ID do usuário
   * @returns Lista de avaliações do usuário
   */
  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      const reviewsRef = f.collection(db, this.collection);
      const q = f.query(reviewsRef, f.where('userId', '==', userId), f.orderBy('createdAt', 'desc'));

      const querySnapshot = await f.getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
    } catch (error) {
      loggingService.error('Erro ao buscar avaliações do usuário', {
        userId,
        error,
      });
      // Retornar array vazio em caso de erro para evitar quebrar a UI
      return [];
    }
  }
}
