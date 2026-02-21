import { Product, ProductCategories } from '../types/Product';
import { loggingService } from './LoggingService';
import { OrderService } from './OrderService';
import { ProductService } from './ProductService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chaves para armazenamento no AsyncStorage
const PRODUCT_VIEW_HISTORY_KEY = 'product_view_history';
const USER_PREFERENCES_KEY = 'user_preferences';

// Interface para rastreamento de visualização de produtos
interface ProductView {
  productId: string;
  timestamp: number;
  timeSpent: number; // tempo em segundos
}

// Interface para preferências do usuário
interface UserPreferences {
  userId: string;
  favoriteCategories: { [category: string]: number }; // categoria -> peso
  favoriteTags: { [tag: string]: number }; // tag -> peso
  priceRange: { min: number; max: number };
  lastUpdated: number;
}

// Interface para score de recomendação
interface RecommendationScore {
  product: Product;
  score: number;
}

export class RecommendationService {
  private static instance: RecommendationService;
  private orderService: OrderService;
  private productService: ProductService;

  private constructor() {
    this.orderService = new OrderService();
    this.productService = new ProductService();
  }

  public static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  /**
   * Registra visualização de produto para usar nas recomendações
   */
  public async trackProductView(productId: string, timeSpent: number = 0): Promise<void> {
    try {
      // Obter histórico de visualizações atual
      const history = await this.getProductViewHistory();

      // Adicionar visualização atual
      const newView: ProductView = {
        productId,
        timestamp: Date.now(),
        timeSpent,
      };

      // Limitar histórico a 100 itens, removendo os mais antigos
      const updatedHistory = [newView, ...history].slice(0, 100);

      // Salvar histórico atualizado
      await AsyncStorage.setItem(PRODUCT_VIEW_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      loggingService.error('Erro ao registrar visualização de produto', { error });
    }
  }

  /**
   * Recupera histórico de visualizações
   */
  private async getProductViewHistory(): Promise<ProductView[]> {
    try {
      const history = await AsyncStorage.getItem(PRODUCT_VIEW_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      loggingService.error('Erro ao recuperar histórico de visualizações', { error });
      return [];
    }
  }

  /**
   * Atualiza as preferências do usuário com base em suas interações
   */
  public async updateUserPreferences(
    userId: string,
    categoryViewed?: string,
    tagViewed?: string,
    price?: number
  ): Promise<void> {
    try {
      // Obter preferências atuais
      let preferences = await this.getUserPreferences(userId);

      if (!preferences) {
        // Inicializar preferências se não existirem
        preferences = {
          userId,
          favoriteCategories: {},
          favoriteTags: {},
          priceRange: { min: 0, max: 1000 },
          lastUpdated: Date.now(),
        };
      }

      // Atualizar categorias favoritas
      if (categoryViewed) {
        const currentValue = preferences.favoriteCategories[categoryViewed] || 0;
        preferences.favoriteCategories[categoryViewed] = currentValue + 1;
      }

      // Atualizar tags favoritas
      if (tagViewed) {
        const currentValue = preferences.favoriteTags[tagViewed] || 0;
        preferences.favoriteTags[tagViewed] = currentValue + 1;
      }

      // Atualizar faixa de preço
      if (price) {
        preferences.priceRange.min = Math.min(preferences.priceRange.min, price);
        preferences.priceRange.max = Math.max(preferences.priceRange.max, price);
      }

      preferences.lastUpdated = Date.now();

      // Salvar preferências atualizadas
      await AsyncStorage.setItem(`${USER_PREFERENCES_KEY}_${userId}`, JSON.stringify(preferences));
    } catch (error) {
      loggingService.error('Erro ao atualizar preferências do usuário', { error });
    }
  }

  /**
   * Recupera preferências do usuário
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const preferences = await AsyncStorage.getItem(`${USER_PREFERENCES_KEY}_${userId}`);
      return preferences ? JSON.parse(preferences) : null;
    } catch (error) {
      loggingService.error('Erro ao recuperar preferências do usuário', { error });
      return null;
    }
  }

  /**
   * Obtém recomendações baseadas no histórico de compras do usuário
   */
  public async getRecommendationsBasedOnPurchaseHistory(
    userId: string,
    limit: number = 10
  ): Promise<Product[]> {
    try {
      // Buscar histórico de pedidos do usuário
      const userOrders = await this.orderService.getUserOrders(userId);

      if (!userOrders || userOrders.length === 0) {
        // Se não há pedidos, retornar produtos destacados
        return this.productService.getFeaturedProducts(limit);
      }

      // Extrair IDs de produtos comprados
      const purchasedProductIds = new Set<string>();
      const purchasedCategories = new Map<string, number>();

      userOrders.forEach(order => {
        order.items.forEach(item => {
          purchasedProductIds.add(item.productId);

          // Contar frequência de categorias
          const product = this.productService.getProductById(item.productId);
          if (product) {
            const category = product.categoria;
            purchasedCategories.set(category, (purchasedCategories.get(category) || 0) + 1);
          }
        });
      });

      // Ordenar categorias por frequência
      const sortedCategories = Array.from(purchasedCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

      // Buscar produtos similares nas mesmas categorias
      let recommendedProducts: Product[] = [];

      // Para cada categoria favorita
      for (const category of sortedCategories) {
        if (recommendedProducts.length >= limit) break;

        // Buscar produtos da categoria que não foram comprados ainda
        const categoryProducts = await this.productService.getProductsByCategory(category);
        const newRecommendations = categoryProducts
          .filter(p => !purchasedProductIds.has(p.id))
          .slice(0, limit - recommendedProducts.length);

        recommendedProducts = [...recommendedProducts, ...newRecommendations];
      }

      // Se ainda não temos produtos suficientes, adicionar destaques
      if (recommendedProducts.length < limit) {
        const featuredProducts = await this.productService.getFeaturedProducts(
          limit - recommendedProducts.length
        );

        const newFeaturedProducts = featuredProducts.filter(
          p => !purchasedProductIds.has(p.id) && !recommendedProducts.some(rp => rp.id === p.id)
        );

        recommendedProducts = [...recommendedProducts, ...newFeaturedProducts];
      }

      return recommendedProducts.slice(0, limit);
    } catch (error) {
      loggingService.error('Erro ao obter recomendações por histórico de compras', { error });
      return this.productService.getFeaturedProducts(limit);
    }
  }

  /**
   * Obtém recomendações baseadas nas visualizações recentes
   */
  public async getRecommendationsBasedOnViews(limit: number = 10): Promise<Product[]> {
    try {
      // Buscar histórico de visualizações
      const viewHistory = await this.getProductViewHistory();

      if (viewHistory.length === 0) {
        // Se não há visualizações, retornar produtos destacados
        return this.productService.getFeaturedProducts(limit);
      }

      // Extrair IDs de produtos visualizados recentemente (últimas 24 horas)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentViews = viewHistory.filter(view => view.timestamp >= oneDayAgo);

      // Se não houver visualizações recentes, usar todo o histórico
      const relevantViews = recentViews.length > 0 ? recentViews : viewHistory;

      // Extrair IDs de produtos visualizados e obter detalhes
      const viewedProductIds = new Set(relevantViews.map(view => view.productId));
      const viewedProducts: Product[] = [];

      for (const productId of viewedProductIds) {
        const product = await this.productService.getProductById(productId);
        if (product && product.disponivel) {
          viewedProducts.push(product);
        }
      }

      // Buscar produtos similares baseados nas categorias visualizadas
      const viewedCategories = new Set(viewedProducts.map(p => p.categoria));
      let recommendedProducts: Product[] = [];

      // Para cada categoria visualizada
      for (const category of viewedCategories) {
        if (recommendedProducts.length >= limit) break;

        // Buscar produtos da categoria
        const categoryProducts = await this.productService.getProductsByCategory(category);

        // Filtrar produtos já visualizados
        const newRecommendations = categoryProducts
          .filter(p => !viewedProductIds.has(p.id))
          .slice(0, limit - recommendedProducts.length);

        recommendedProducts = [...recommendedProducts, ...newRecommendations];
      }

      // Se ainda não temos produtos suficientes, adicionar destaques
      if (recommendedProducts.length < limit) {
        const featuredProducts = await this.productService.getFeaturedProducts(
          limit - recommendedProducts.length
        );

        const newFeaturedProducts = featuredProducts.filter(
          p => !viewedProductIds.has(p.id) && !recommendedProducts.some(rp => rp.id === p.id)
        );

        recommendedProducts = [...recommendedProducts, ...newFeaturedProducts];
      }

      return recommendedProducts.slice(0, limit);
    } catch (error) {
      loggingService.error('Erro ao obter recomendações por visualizações', { error });
      return this.productService.getFeaturedProducts(limit);
    }
  }

  /**
   * Obtém as melhores recomendações personalizadas para o usuário
   * combinando histórico de compras, visualizações e preferências
   */
  public async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<Product[]> {
    try {
      // Buscar produtos usando diferentes estratégias
      const purchaseBasedRecs = await this.getRecommendationsBasedOnPurchaseHistory(
        userId,
        limit * 2
      );
      const viewBasedRecs = await this.getRecommendationsBasedOnViews(limit * 2);

      // Buscar preferências do usuário
      const preferences = await this.getUserPreferences(userId);

      // Combinar e pontuar todos os produtos
      const allCandidates = [...purchaseBasedRecs, ...viewBasedRecs];
      const scoredProducts: RecommendationScore[] = [];
      const seenProductIds = new Set<string>();

      // Pontuar cada produto
      for (const product of allCandidates) {
        // Evitar duplicatas
        if (seenProductIds.has(product.id)) continue;
        seenProductIds.add(product.id);

        let score = 0;

        // Pontos para produtos destacados
        if (product.destacado) score += 5;

        // Pontos baseados em preferências
        if (preferences) {
          // Pontos por categoria
          const categoryScore = preferences.favoriteCategories[product.categoria] || 0;
          score += categoryScore * 2;

          // Pontos por tags
          if (product.tagsEspeciais) {
            for (const tag of product.tagsEspeciais) {
              const tagScore = preferences.favoriteTags[tag] || 0;
              score += tagScore;
            }
          }

          // Pontos por preço (mais próximo da média do histórico)
          const avgPrice = (preferences.priceRange.min + preferences.priceRange.max) / 2;
          const priceDiff = Math.abs(product.preco - avgPrice);
          const maxPriceDiff = preferences.priceRange.max - preferences.priceRange.min;

          if (maxPriceDiff > 0) {
            const priceScore = 1 - priceDiff / maxPriceDiff;
            score += priceScore * 3;
          }
        }

        // Adicionar ao conjunto de produtos pontuados
        scoredProducts.push({ product, score });
      }

      // Ordenar por pontuação e retornar os top N
      const topRecommendations = scoredProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.product);

      return topRecommendations;
    } catch (error) {
      loggingService.error('Erro ao obter recomendações personalizadas', { error });
      return this.productService.getFeaturedProducts(limit);
    }
  }
}

export default RecommendationService;
