import * as firestore from 'firebase/firestore';
import { db } from '@/config/firebase';

// Helper to access members that might not be correctly exported as named members in this environment
const {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  limit,
  startAfter,
  Timestamp,
  increment,
  runTransaction
} = firestore as any;

import { Review, ReviewFilters, ReviewSummary } from '../types/Review';
import { loggingService } from './LoggingService';
import { SecurityUtils } from '../utils/SecurityUtils';

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
      const reviewsRef = collection(db, this.collection);
      let q = query(reviewsRef, orderBy('createdAt', 'desc'), limit(this.pageSize));

      if (lastReview) {
        q = query(
          reviewsRef,
          orderBy('createdAt', 'desc'),
          startAfter((Timestamp as any).fromDate(new Date(lastReview.createdAt))),
          limit(this.pageSize)
        );
      }

      const querySnapshot = await getDocs(q);
      const reviews: Review[] = [];

      for (const doc of querySnapshot.docs) {
        const review = {
          id: doc.id,
          ...doc.data(),
        } as Review;
        reviews.push(review);
      }

      return this.applyFilters(reviews, filters);
    } catch (error: any) {
      loggingService.error('Erro ao buscar avaliações', {
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getReviewById(reviewId: string): Promise<Review | null> {
    try {
      const reviewRef = doc(db, this.collection, reviewId);
      const reviewDoc = await getDoc(reviewRef);

      if (!reviewDoc.exists()) {
        return null;
      }

      return {
        id: reviewDoc.id,
        ...reviewDoc.data(),
      } as Review;
    } catch (error: any) {
      loggingService.error('Erro ao buscar avaliação', {
        reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getReviewsByOrder(orderId: string): Promise<Review[]> {
    try {
      const reviewsRef = collection(db, this.collection);
      const q = query(reviewsRef, where('orderId', '==', orderId), orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
    } catch (error: any) {
      loggingService.error('Erro ao buscar avaliações do pedido', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getReviewSummary(): Promise<ReviewSummary> {
    try {
      const reviewsRef = collection(db, this.collection);
      const q = query(reviewsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
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
    } catch (error: any) {
      loggingService.error('Erro ao buscar resumo de avaliações', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    try {
      // Sanitizar o comentário para prevenir XSS
      const sanitizedComment = SecurityUtils.sanitizeHTML(review.comment);
      const createdAt = new Date().toISOString();
      const updatedAt = createdAt;
      
      const newReviewData = {
        ...review,
        comment: sanitizedComment,
        createdAt,
        updatedAt,
      };

      // Usar transação para garantir que o pedido e o entregador sejam atualizados
      return await runTransaction(db, async (transaction: any) => {
        // 1. Criar a avaliação
        const reviewsRef = collection(db, this.collection);
        const reviewDocRef = doc(reviewsRef);
        transaction.set(reviewDocRef, newReviewData);

        // 2. Atualizar o pedido com a avaliação
        const orderRef = doc(db, 'orders', review.orderId);
        const orderDoc = await transaction.get(orderRef);
        
        if (orderDoc.exists()) {
          const orderData = orderDoc.data();
          transaction.update(orderRef, {
            rating: {
              rating: review.rating,
              driverRating: review.driverRating,
              comment: sanitizedComment,
              createdAt,
            }
          });

          // 3. Atualizar a média do entregador se houver driverRating e o pedido tiver um entregador
          if (review.driverRating && orderData.deliveryDriver?.id) {
            const driverId = orderData.deliveryDriver.id;
            const driverRef = doc(db, 'delivery_drivers', driverId);
            const driverDoc = await transaction.get(driverRef);

            if (driverDoc.exists()) {
              const driverData = driverDoc.data();
              const currentRating = driverData.rating || { average: 0, count: 0 };
              const newCount = (currentRating.count || 0) + 1;
              const newAverage = ((currentRating.average || 0) * (currentRating.count || 0) + review.driverRating) / newCount;

              transaction.update(driverRef, {
                rating: {
                  average: newAverage,
                  count: newCount,
                }
              });
            }
          }
        }

        loggingService.info('Avaliação criada com sucesso com transação', { reviewId: reviewDocRef.id });
        
        return {
          id: reviewDocRef.id,
          ...newReviewData,
        } as Review;
      });
    } catch (error: any) {
      loggingService.error('Erro ao criar avaliação', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async updateReview(reviewId: string, updates: Partial<Review>): Promise<void> {
    try {
      // Sanitizar o comentário para prevenir XSS se estiver sendo atualizado
      const sanitizedUpdates = { ...updates };
      if (updates.comment) {
        sanitizedUpdates.comment = SecurityUtils.sanitizeHTML(updates.comment);
      }
      
      const reviewRef = doc(db, this.collection, reviewId);
      await updateDoc(reviewRef, {
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Avaliação atualizada com sucesso', { reviewId });
    } catch (error: any) {
      loggingService.error('Erro ao atualizar avaliação', {
        reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = doc(db, this.collection, reviewId);
      await deleteDoc(reviewRef);

      loggingService.info('Avaliação excluída com sucesso', { reviewId });
    } catch (error: any) {
      loggingService.error('Erro ao excluir avaliação', {
        reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async likeReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = doc(db, this.collection, reviewId);
      await updateDoc(reviewRef, {
        likes: increment(1),
      });

      loggingService.info('Avaliação curtida com sucesso', { reviewId });
    } catch (error: any) {
      loggingService.error('Erro ao curtir avaliação', {
        reviewId,
        error: error instanceof Error ? error.message : String(error),
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
      const reviewsRef = collection(db, this.collection);
      const q = query(reviewsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
    } catch (error: any) {
      loggingService.error('Erro ao buscar avaliações do usuário', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Retornar array vazio em caso de erro para evitar quebrar a UI
      return [];
    }
  }
}

