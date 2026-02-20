import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  useTheme,
  Divider,
  Searchbar,
  SegmentedButtons,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Review, ReviewFilters, ReviewSummary } from '../types/Review';
import { ReviewService } from '../services/ReviewService';
import { StarRating } from '../components/StarRating';

export function ReviewsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ReviewFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withImages, setWithImages] = useState(false);
  type SortBy = 'newest' | 'highest' | 'lowest' | 'mostLiked';
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

  const reviewService = ReviewService.getInstance();
      const [reviewsData, summaryData] = await Promise.all([
        reviewService.getReviews(filters),
        reviewService.getReviewSummary(),
      ]);

      setReviews(reviewsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, search: query }));
  };

  const handleApplyFilters = () => {
    setFilters(prev => ({
      ...prev,
      rating: selectedRating || undefined,
      verified: verifiedOnly || undefined,
      hasImages: withImages || undefined,
      sortBy,
    }));
    setShowFilters(false);
  };

  const handleLikeReview = async (reviewId: string) => {
    try {
  const reviewService = ReviewService.getInstance();
      await reviewService.likeReview(reviewId);
      await loadData();
    } catch (err) {
      // TODO: Mostrar mensagem de erro
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando avaliações..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && <ErrorMessage message={error} onRetry={loadData} />}

        <View style={styles.header}>
          <Searchbar
            placeholder="Buscar avaliações"
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
          />

          <Button mode="outlined" onPress={() => setShowFilters(true)} style={styles.filterButton}>
            Filtros
          </Button>
        </View>

        {summary && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <View style={styles.summaryHeader}>
                <View style={styles.ratingContainer}>
                  <Text variant="headlineLarge" style={styles.averageRating}>
                    {summary.averageRating.toFixed(1)}
                  </Text>
                  <StarRating rating={summary.averageRating} size={24} />
                  <Text variant="bodyMedium" style={styles.totalReviews}>
                    {summary.totalReviews} avaliações
                  </Text>
                </View>

                <View style={styles.ratingDistribution}>
                  {[5, 4, 3, 2, 1].map(rating => (
                    <View key={rating} style={styles.ratingBar}>
                      <Text variant="bodySmall">{rating}</Text>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            {
                              width: `${(summary.ratingDistribution[rating] / summary.totalReviews) * 100}%`,
                              backgroundColor: theme.colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text variant="bodySmall">{summary.ratingDistribution[rating]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Nenhuma avaliação encontrada
            </Text>
          </View>
        ) : (
          reviews.map(review => (
            <Card key={review.id} style={styles.reviewCard}>
              <Card.Content>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewInfo}>
                    <StarRating rating={review.rating} size={16} />
                    <Text variant="bodySmall" style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  {review.isVerified && (
                    <Chip icon="check-circle" style={styles.verifiedChip}>
                      Verificado
                    </Chip>
                  )}
                </View>

                <Text variant="bodyLarge" style={styles.reviewComment}>
                  {review.comment}
                </Text>

                {review.images && review.images.length > 0 && (
                  <View style={styles.imageContainer}>
                    {review.images.map((image, index) => (
                      <View key={index} style={styles.imagePlaceholder}>
                        <Text variant="bodySmall">Imagem {index + 1}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.reviewFooter}>
                  <Button mode="text" onPress={() => handleLikeReview(review.id)} icon="heart">
                    {review.likes || 0}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Filtros
          </Text>

          <Text variant="titleMedium" style={styles.filterSection}>
            Avaliação
          </Text>
          <View style={styles.ratingFilter}>
            {[5, 4, 3, 2, 1].map(rating => (
              <Chip
                key={rating}
                selected={selectedRating === rating}
                onPress={() => setSelectedRating(rating === selectedRating ? null : rating)}
                style={styles.ratingChip}
              >
                {rating} estrelas
              </Chip>
            ))}
          </View>

          <Text variant="titleMedium" style={styles.filterSection}>
            Ordenar por
          </Text>
          <SegmentedButtons
            value={sortBy}
            onValueChange={value => setSortBy(value as SortBy)}
            buttons={[
              { value: 'newest', label: 'Mais recentes' },
              { value: 'highest', label: 'Melhor avaliados' },
              { value: 'lowest', label: 'Pior avaliados' },
              { value: 'mostLiked', label: 'Mais curtidos' },
            ]}
            style={styles.sortButtons}
          />

          <View style={styles.checkboxContainer}>
            <Button
              mode={verifiedOnly ? 'contained' : 'outlined'}
              onPress={() => setVerifiedOnly(!verifiedOnly)}
              style={styles.checkboxButton}
            >
              Apenas verificados
            </Button>
            <Button
              mode={withImages ? 'contained' : 'outlined'}
              onPress={() => setWithImages(!withImages)}
              style={styles.checkboxButton}
            >
              Com imagens
            </Button>
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowFilters(false)}
              style={styles.modalButton}
            >
              Cancelar
            </Button>
            <Button mode="contained" onPress={handleApplyFilters} style={styles.modalButton}>
              Aplicar
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
  },
  filterButton: {
    marginBottom: 16,
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    alignItems: 'center',
    flex: 1,
  },
  averageRating: {
    marginBottom: 8,
  },
  totalReviews: {
    marginTop: 4,
    color: '#666',
  },
  ratingDistribution: {
    flex: 2,
    marginLeft: 16,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  reviewCard: {
    margin: 16,
    marginTop: 0,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    marginLeft: 8,
    color: '#666',
  },
  verifiedChip: {
    backgroundColor: '#e3f2fd',
  },
  reviewComment: {
    marginBottom: 16,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#eee',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 8,
  },
  ratingFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  ratingChip: {
    marginRight: 8,
  },
  sortButtons: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  checkboxButton: {
    flex: 1,
    minWidth: '45%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});

