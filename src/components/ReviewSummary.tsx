import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Layout,
  FadeIn,
  interpolate,
  Extrapolate,
  SlideInLeft,
  ZoomIn,
  Easing,
} from 'react-native-reanimated';
import { StarRating } from './StarRating';
import { Card } from './base/Card';
import { wp, hp, fontSize, spacing } from '../utils/responsive';

interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: Record<number, number>;
  style?: any;
  animated?: boolean;
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  averageRating,
  totalReviews,
  ratingDistribution = {},
  style,
  animated = true,
}) => {
  // Valores animados
  const ratingScale = useSharedValue(animated ? 0 : 1);
  const numberOpacity = useSharedValue(animated ? 0 : 1);
  const numberScale = useSharedValue(animated ? 0.5 : 1);
  const barWidth = useSharedValue(animated ? 0 : 1);
  const textWidth = useSharedValue(0);
  const rating = useSharedValue(averageRating);
  const reviewCount = useSharedValue(totalReviews);
  const distributionBars = useSharedValue<Record<number, number>>({});
  const distributionOpacity = useSharedValue(animated ? 0 : 1);
  const showDistribution = useSharedValue(0);

  // Inicializar distribuição de notas
  useEffect(() => {
    // Valores iniciais para todas as notas
    const initialValues: Record<number, number> = {};
    [5, 4, 3, 2, 1].forEach(star => {
      initialValues[star] = 0;
    });
    distributionBars.value = initialValues;

    // Se temos dados de distribuição, mostrar a seção
    if (Object.keys(ratingDistribution).length > 0) {
      showDistribution.value = withTiming(1, { duration: 300 });
    }
  }, []);

  // Animações na montagem do componente
  useEffect(() => {
    if (animated) {
      // Animação da estrela
      ratingScale.value = withSequence(
        withDelay(
          300,
          withTiming(1.2, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
        ),
        withTiming(1, { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      );

      // Animação do número da avaliação
      numberOpacity.value = withDelay(
        500,
        withTiming(1, { duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1) })
      );

      numberScale.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 100 }));

      // Animação da barra
      barWidth.value = withDelay(
        700,
        withTiming(1, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) })
      );

      // Animação da distribuição
      distributionOpacity.value = withDelay(
        900,
        withTiming(1, { duration: 500, easing: Easing.bezier(0.16, 1, 0.3, 1) })
      );

      // Animar cada barra de distribuição em sequência
      setTimeout(() => {
        const newValues = { ...distributionBars.value };

        [5, 4, 3, 2, 1].forEach((star, index) => {
          setTimeout(() => {
            // Calcular a porcentagem real para esta nota
            const count = ratingDistribution[star] || 0;
            const percentage = totalReviews > 0 ? count / totalReviews : 0;

            newValues[star] = withTiming(percentage, {
              duration: 800,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            });
            distributionBars.value = { ...newValues };
          }, index * 150);
        });
      }, 1000);
    } else {
      // Se não animado, mostrar valores finais imediatamente
      const newValues = { ...distributionBars.value };
      [5, 4, 3, 2, 1].forEach(star => {
        const count = ratingDistribution[star] || 0;
        const percentage = totalReviews > 0 ? count / totalReviews : 0;
        newValues[star] = percentage;
      });
      distributionBars.value = newValues;
    }
  }, [animated, ratingDistribution, totalReviews]);

  // Animar quando os valores mudarem
  useEffect(() => {
    if (rating.value !== averageRating) {
      // Animar a escala do rating
      ratingScale.value = withSequence(
        withTiming(1.15, { duration: 200 }),
        withTiming(1, { duration: 300 })
      );

      // Animar o próprio valor de rating
      rating.value = withTiming(averageRating, { duration: 500 });

      // Animar a barra
      barWidth.value = withSequence(
        withTiming(0.8, { duration: 150 }),
        withTiming(1, { duration: 450 })
      );

      // Animar o texto de classificação
      textWidth.value = withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 300 })
      );
    }

    if (reviewCount.value !== totalReviews) {
      // Animar a mudança na contagem de avaliações
      numberScale.value = withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 300 })
      );

      reviewCount.value = withTiming(totalReviews, { duration: 500 });
    }
  }, [averageRating, totalReviews]);

  // Estilos animados
  const ratingAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: ratingScale.value }],
    };
  });

  const numberAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: numberOpacity.value,
      transform: [{ scale: numberScale.value }],
    };
  });

  const barAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${interpolate(
        (barWidth.value * rating.value) / 5,
        [0, 1],
        [0, 100],
        Extrapolate.CLAMP
      )}%`,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: textWidth.value }],
    };
  });

  const ratingTextAnimatedStyle = useAnimatedStyle(() => {
    return {
      fontSize: fontSize(36),
      fontWeight: 'bold',
      color: '#333',
      marginBottom: spacing(4),
    };
  });

  const countAnimatedStyle = useAnimatedStyle(() => {
    return {
      fontSize: fontSize(16),
      color: '#666',
    };
  });

  const distributionContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: distributionOpacity.value,
      height: interpolate(showDistribution.value, [0, 1], [0, hp(150)], Extrapolate.CLAMP),
      overflow: 'hidden',
      marginTop: interpolate(showDistribution.value, [0, 1], [0, spacing(16)], Extrapolate.CLAMP),
      paddingTop: interpolate(showDistribution.value, [0, 1], [0, spacing(8)], Extrapolate.CLAMP),
      borderTopWidth: interpolate(showDistribution.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    };
  });

  // Gerar estilos para cada barra de distribuição
  const getDistributionBarStyle = (star: number) => {
    return useAnimatedStyle(() => {
      return {
        width: `${distributionBars.value[star] * 100}%`,
        backgroundColor: getStarColor(star),
      };
    });
  };

  // Determinar a cor baseada na avaliação média
  const getRatingColor = () => {
    if (averageRating >= 4.5) return '#2ecc71'; // Verde para excelente
    if (averageRating >= 3.5) return '#3498db'; // Azul para bom
    if (averageRating >= 2.5) return '#f39c12'; // Laranja para regular
    return '#e74c3c'; // Vermelho para ruim
  };

  // Determinar cor por número de estrela
  const getStarColor = (stars: number) => {
    switch (stars) {
      case 5:
        return '#2ecc71'; // Verde
      case 4:
        return '#3498db'; // Azul
      case 3:
        return '#f39c12'; // Laranja
      case 2:
        return '#e67e22'; // Laranja escuro
      case 1:
        return '#e74c3c'; // Vermelho
      default:
        return '#bdc3c7'; // Cinza
    }
  };

  // Determinar texto baseado na avaliação média
  const getRatingText = () => {
    if (averageRating >= 4.5) return 'Excelente';
    if (averageRating >= 3.5) return 'Muito bom';
    if (averageRating >= 2.5) return 'Regular';
    if (averageRating >= 1.5) return 'Ruim';
    return 'Muito ruim';
  };

  return (
    <Card style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Avaliações dos clientes</Text>
        <Animated.Text
          style={[styles.totalReviews, numberAnimatedStyle]}
          layout={Layout.springify()}
        >
          {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
        </Animated.Text>
      </View>

      <View style={styles.content}>
        <View style={styles.ratingColumn}>
          <Animated.View style={ratingAnimatedStyle}>
            <Animated.Text style={ratingTextAnimatedStyle} layout={Layout.springify()}>
              {averageRating.toFixed(1)}
            </Animated.Text>
          </Animated.View>

          <Animated.View style={numberAnimatedStyle}>
            <StarRating rating={averageRating} size={20} />
          </Animated.View>
        </View>

        <View style={styles.detailsColumn}>
          <View style={styles.ratingBarContainer}>
            <Animated.View
              style={[styles.ratingBar, { backgroundColor: getRatingColor() }, barAnimatedStyle]}
              layout={Layout.springify()}
            />
          </View>

          <Animated.Text
            style={[
              styles.ratingText,
              { color: getRatingColor() },
              numberAnimatedStyle,
              textAnimatedStyle,
            ]}
            layout={Layout.springify()}
          >
            {getRatingText()}
          </Animated.Text>
        </View>
      </View>

      {/* Distribuição de avaliações por estrelas */}
      <Animated.View style={[styles.distributionContainer, distributionContainerStyle]}>
        <Animated.Text style={styles.distributionTitle} entering={FadeIn.delay(1000).duration(400)}>
          Distribuição de avaliações
        </Animated.Text>

        {[5, 4, 3, 2, 1].map((star, index) => {
          const count = ratingDistribution[star] || 0;
          const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

          return (
            <Animated.View
              key={star}
              style={styles.distributionRow}
              entering={SlideInLeft.delay(1100 + index * 100).duration(400)}
            >
              <View style={styles.starLabel}>
                <Text style={styles.starLabelText}>{star}</Text>
                <Text style={styles.starIcon}>★</Text>
              </View>

              <View style={styles.distributionBarContainer}>
                <Animated.View style={[styles.distributionBar, getDistributionBarStyle(star)]} />
              </View>

              <Animated.Text
                style={styles.percentageText}
                entering={ZoomIn.delay(1200 + index * 100).duration(400)}
              >
                {percentage}%
              </Animated.Text>

              <Text style={styles.countText}>({count})</Text>
            </Animated.View>
          );
        })}
      </Animated.View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(16),
  },
  title: {
    fontSize: fontSize(16),
    fontWeight: 'bold',
    color: '#333',
  },
  totalReviews: {
    fontSize: fontSize(14),
    color: '#666',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingColumn: {
    alignItems: 'center',
    marginRight: spacing(20),
  },
  detailsColumn: {
    flex: 1,
  },
  ratingBarContainer: {
    height: hp(16),
    backgroundColor: '#f0f0f0',
    borderRadius: wp(8),
    overflow: 'hidden',
    marginBottom: spacing(8),
  },
  ratingBar: {
    height: '100%',
    borderRadius: wp(8),
  },
  ratingText: {
    fontSize: fontSize(14),
    fontWeight: '500',
  },
  distributionContainer: {
    borderTopColor: '#f0f0f0',
  },
  distributionTitle: {
    fontSize: fontSize(14),
    fontWeight: '500',
    color: '#333',
    marginBottom: spacing(8),
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  starLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: wp(32),
    marginRight: spacing(8),
  },
  starLabelText: {
    fontSize: fontSize(14),
    color: '#333',
    marginRight: spacing(2),
  },
  starIcon: {
    fontSize: fontSize(14),
    color: '#f39c12',
  },
  distributionBarContainer: {
    flex: 1,
    height: hp(12),
    backgroundColor: '#f0f0f0',
    borderRadius: wp(6),
    overflow: 'hidden',
    marginRight: spacing(8),
  },
  distributionBar: {
    height: '100%',
    borderRadius: wp(6),
  },
  percentageText: {
    fontSize: fontSize(14),
    color: '#333',
    width: wp(40),
    textAlign: 'right',
    marginRight: spacing(4),
  },
  countText: {
    fontSize: fontSize(12),
    color: '#666',
    width: wp(32),
  },
});
