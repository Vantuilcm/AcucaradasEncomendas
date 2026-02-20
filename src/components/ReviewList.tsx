import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
  ZoomIn,
  SlideInRight,
  StretchInX,
  FlipInEasyX,
} from 'react-native-reanimated';
import { StarRating } from './StarRating';
import { Review } from '../models/Review';
import { wp, fontSize, spacing } from '../utils/responsive';

interface ReviewListProps {
  reviews: Review[];
  onLikeReview?: (reviewId: string) => void;
  emptyMessage?: string;
  style?: any;
  animationVariant?: 'default' | 'staggered' | 'zoom' | 'flip';
}

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  onLikeReview,
  emptyMessage = 'Nenhuma avaliação encontrada.',
  style,
  animationVariant = 'default',
}) => {
  // Valores animados para feedback visual
  const highlightedReviewId = useSharedValue<string | null>(null);
  const likeScale = useSharedValue<Record<string, number>>({});
  const isInitialRender = useSharedValue(true);

  // Inicializar valores para animação de likes
  useEffect(() => {
    if (reviews.length > 0) {
      const initialLikeScales: Record<string, number> = {};
      reviews.forEach(review => {
        initialLikeScales[review.id] = 1;
      });
      likeScale.value = initialLikeScales;
    }

    // Definir o renderizador inicial como falso após 1s para habilitar animações subsequentes
    const timeout = setTimeout(() => {
      isInitialRender.value = false;
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  // Estilo animado para highlight ao tocar em uma avaliação
  const getAnimatedStyle = (reviewId: string) => {
    return useAnimatedStyle(() => {
      const isHighlighted = highlightedReviewId.value === reviewId;
      return {
        backgroundColor: isHighlighted
          ? withTiming('rgba(52, 152, 219, 0.05)', {
              duration: 300,
              easing: Easing.bezier(0.16, 1, 0.3, 1) as any,
            })
          : withTiming('transparent', { duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1) as any }),
        transform: [
          {
            scale: isHighlighted
              ? withSequence(
                  withTiming(1.03, { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) as any }),
                  withTiming(1, { duration: 300, easing: Easing.bezier(0.16, 1, 0.3, 1) as any })
                )
              : 1,
          },
        ],
        borderRadius: isHighlighted
          ? withTiming(wp(12), { duration: 300 })
          : withTiming(wp(8), { duration: 300 }),
      };
    });
  };

  // Estilo animado para o botão de like
  const getLikeButtonStyle = (reviewId: string) => {
    return useAnimatedStyle(() => {
      const scale = likeScale.value[reviewId] || 1;
      return {
        transform: [{ scale }],
      };
    });
  };

  // Função para destacar uma avaliação brevemente ao tocar
  const highlightReview = (reviewId: string) => {
    highlightedReviewId.value = reviewId;
    setTimeout(() => {
      highlightedReviewId.value = null;
    }, 800);
  };

  // Animar o botão de like
  const animateLikeButton = (reviewId: string) => {
    if (!likeScale.value[reviewId]) {
      likeScale.value = { ...likeScale.value, [reviewId]: 1 };
    }

    likeScale.value = {
      ...likeScale.value,
      [reviewId]: withSequence(
        withTiming(1.4, { duration: 200, easing: Easing.elastic(1.8) }),
        withTiming(0.8, { duration: 100 }),
        withTiming(1.1, { duration: 150 }),
        withTiming(1, { duration: 100 })
      ),
    };
  };

  // Seleciona a animação com base na variante
  const getEnteringAnimation = (index: number) => {
    const delay = isInitialRender.value ? index * 120 : 0;

    switch (animationVariant) {
      case 'staggered':
        return FadeInDown.delay(delay)
          .duration(400)
          .easing(Easing.bezier(0.25, 0.1, 0.25, 1) as any);
      case 'zoom':
        return ZoomIn.delay(delay)
          .duration(500)
          .easing(Easing.bezier(0.16, 1, 0.3, 1) as any);
      case 'flip':
        return FlipInEasyX.delay(delay).duration(600);
      default:
        return FadeInDown.delay(delay)
          .duration(400)
          .easing(Easing.bezier(0.25, 0.1, 0.25, 1) as any);
    }
  };

  // Renderizar um item de avaliação
  const renderReviewItem = ({ item, index }: { item: Review; index: number }) => {
    const animatedStyle = getAnimatedStyle(item.id);
    const likeButtonStyle = getLikeButtonStyle(item.id);

    return (
      <Animated.View
        entering={getEnteringAnimation(index)}
        exiting={FadeOut.duration(300)}
        layout={Layout.springify().damping(14).stiffness(100)}
        style={[styles.reviewItem, animatedStyle]}
      >
        <View style={styles.reviewHeader}>
          <Animated.Text
            style={styles.reviewAuthor}
            entering={SlideInRight.delay(isInitialRender.value ? index * 100 + 100 : 0).duration(
              400
            )}
          >
            {item.userName}
          </Animated.Text>
          <Animated.Text
            style={styles.reviewDate}
            entering={FadeIn.delay(isInitialRender.value ? index * 100 + 200 : 50).duration(400)}
          >
            {item.date}
          </Animated.Text>
        </View>

        <Animated.View
          entering={StretchInX.delay(isInitialRender.value ? index * 100 + 300 : 100).duration(600)}
          layout={Layout.springify()}
          style={styles.ratingContainer}
        >
          <StarRating rating={item.rating} size={16} />
          <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
        </Animated.View>

        <Animated.Text
          style={styles.reviewComment}
          entering={FadeIn.delay(isInitialRender.value ? index * 100 + 400 : 150).duration(500)}
          layout={Layout.springify()}
        >
          {item.comment}
        </Animated.Text>

        {onLikeReview && (
          <Animated.View
            style={[styles.likeButtonContainer, likeButtonStyle]}
            entering={FadeIn.delay(isInitialRender.value ? index * 100 + 500 : 200).duration(400)}
            layout={Layout.springify()}
          >
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => {
                highlightReview(item.id);
                animateLikeButton(item.id);
                onLikeReview(item.id);
              }}
            >
              <Animated.Text style={styles.likeButtonText} layout={Layout.springify()}>
                👍 {item.likes ? `${item.likes} pessoas acharam útil` : 'Isso foi útil?'}
              </Animated.Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  if (reviews.length === 0) {
    return (
      <Animated.View style={[styles.emptyContainer, style]} entering={FadeIn.duration(400)}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, style]} layout={Layout.springify().damping(12)}>
      <FlatList
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={false}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing(16),
  },
  reviewItem: {
    marginBottom: spacing(16),
    paddingBottom: spacing(16),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: wp(8),
    padding: spacing(12),
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(8),
  },
  reviewAuthor: {
    fontSize: fontSize(15),
    fontWeight: '600',
    color: '#333',
  },
  reviewDate: {
    fontSize: fontSize(13),
    color: '#888',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(8),
  },
  ratingValue: {
    marginLeft: spacing(8),
    fontSize: fontSize(14),
    color: '#666',
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: fontSize(14),
    color: '#444',
    marginTop: spacing(8),
    lineHeight: fontSize(20),
  },
  likeButtonContainer: {
    alignSelf: 'flex-start',
    marginTop: spacing(12),
  },
  likeButton: {
    paddingVertical: spacing(5),
    paddingHorizontal: spacing(10),
    borderRadius: wp(15),
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
  },
  likeButtonText: {
    fontSize: fontSize(12),
    color: '#666',
  },
  emptyContainer: {
    padding: spacing(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSize(14),
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
