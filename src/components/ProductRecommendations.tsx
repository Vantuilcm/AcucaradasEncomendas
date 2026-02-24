import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Product } from '../types/Product';
import { RecommendationService } from '../services/RecommendationService';
import { useAuth } from '../contexts/AuthContext';
import { EnhancedImage, PlaceholderType } from './EnhancedImage';
import { HorizontalListSkeleton } from './SkeletonLoader';

interface ProductRecommendationsProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  onProductPress?: (product: Product) => void;
  recommendationType?: 'personalized' | 'viewed' | 'purchased';
  showSubtitles?: boolean;
  cardStyle?: 'compact' | 'regular';
  containerStyle?: any;
}

const { width } = Dimensions.get('window');

export const ProductRecommendations = ({
  title = 'Recomendados para você',
  subtitle = 'Baseado em suas preferências',
  limit = 10,
  onProductPress,
  recommendationType = 'personalized',
  showSubtitles = true,
  cardStyle = 'regular',
  containerStyle,
}: ProductRecommendationsProps) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recommendationService = RecommendationService.getInstance();

  // Calcular dimensões do card com base no estilo
  const cardWidth = cardStyle === 'compact' ? width * 0.33 : width * 0.45;
  const imageHeight = cardStyle === 'compact' ? 110 : 150;

  // Carregar recomendações conforme o tipo
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          // Se não há usuário autenticado, usar recomendações baseadas em visualizações
          const viewRecommendations =
            await recommendationService.getRecommendationsBasedOnViews(limit);
          setProducts(viewRecommendations);
          return;
        }

        let recommendedProducts: Product[] = [];

        switch (recommendationType) {
          case 'personalized':
            recommendedProducts = await recommendationService.getPersonalizedRecommendations(
              user.id,
              limit
            );
            break;
          case 'viewed':
            recommendedProducts = await recommendationService.getRecommendationsBasedOnViews(limit);
            break;
          case 'purchased':
            recommendedProducts =
              await recommendationService.getRecommendationsBasedOnPurchaseHistory(user.id, limit);
            break;
          default:
            recommendedProducts = await recommendationService.getPersonalizedRecommendations(
              user.id,
              limit
            );
        }

        setProducts(recommendedProducts);
      } catch (err) {
        console.error('Erro ao carregar recomendações:', err);
        setError('Não foi possível carregar as recomendações');
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [user, limit, recommendationType, recommendationService]);

  // Função para renderizar um item do produto
  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        { width: cardWidth },
        cardStyle === 'compact' ? styles.compactCard : styles.regularCard,
      ]}
      activeOpacity={0.7}
      onPress={() => onProductPress && onProductPress(item)}
    >
      <EnhancedImage
        source={{ uri: item.imagens[0] || 'https://via.placeholder.com/150' }}
        style={[styles.productImage, { height: imageHeight }]}
        placeholderType={PlaceholderType.SKELETON}
        lazy={true}
        resizeMode="cover"
      />

      <View style={styles.productInfo}>
        <Text
          style={[styles.productName, cardStyle === 'compact' ? styles.compactText : {}]}
          numberOfLines={1}
        >
          {item.nome}
        </Text>

        <Text style={[styles.productPrice, cardStyle === 'compact' ? styles.compactPrice : {}]}>
          R$ {item.preco.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Personalizar o título baseado no tipo de recomendação
  const getRecommendationTitle = () => {
    if (title) return title;

    switch (recommendationType) {
      case 'personalized':
        return 'Recomendados para você';
      case 'viewed':
        return 'Baseado no que você viu';
      case 'purchased':
        return 'Clientes que compraram também gostam';
      default:
        return 'Recomendações para você';
    }
  };

  // Personalizar o subtítulo baseado no tipo de recomendação
  const getRecommendationSubtitle = () => {
    if (subtitle) return subtitle;

    switch (recommendationType) {
      case 'personalized':
        return 'Baseado em suas preferências';
      case 'viewed':
        return 'Produtos similares ao que você visualizou';
      case 'purchased':
        return 'Combinam com suas compras anteriores';
      default:
        return 'Produtos que podem te interessar';
    }
  };

  // Se não há produtos para recomendar, não mostra o componente
  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Título e subtítulo */}
      <View style={styles.header}>
        <Text style={styles.title}>{getRecommendationTitle()}</Text>
        {showSubtitles && <Text style={styles.subtitle}>{getRecommendationSubtitle()}</Text>}
      </View>

      {/* Estado de carregamento */}
      {loading ? (
        <HorizontalListSkeleton count={Math.min(5, limit)} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
          snapToAlignment="start"
          snapToInterval={cardWidth + 16} // Largura do card + margem
          decelerationRate="fast"
        />
      )}

      {/* Mensagem de erro */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  productList: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  productCard: {
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  regularCard: {
    height: 230,
  },
  compactCard: {
    height: 180,
  },
  productImage: {
    width: '100%',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  compactText: {
    fontSize: 12,
  },
  compactPrice: {
    fontSize: 13,
  },
  errorText: {
    textAlign: 'center',
    color: '#F44336',
    padding: 16,
  },
});
