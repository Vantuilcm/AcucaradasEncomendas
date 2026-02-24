import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, Easing } from 'react-native';
import { useTheme } from 'react-native-paper';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  backgroundColor?: string;
  highlightColor?: string;
  speed?: number; // Velocidade da animação em ms
  children?: React.ReactNode;
  variant?: 'rectangular' | 'circular' | 'text';
}

export const SkeletonLoader = ({
  width = '100%',
  height = 20,
  borderRadius,
  style,
  backgroundColor,
  highlightColor,
  speed = 1500,
  children,
  variant = 'rectangular',
}: SkeletonProps) => {
  const theme = useTheme();
  const shimmerValue = useRef(new Animated.Value(0)).current;

  // Cores padrão baseadas no tema
  const defaultBgColor = backgroundColor || theme.colors.surfaceVariant;
  const defaultHighlightColor = highlightColor || theme.colors.surface;

  // Raio da borda baseado na variante
  const defaultBorderRadius =
    borderRadius !== undefined
      ? borderRadius
      : variant === 'circular'
        ? 999
        : variant === 'text'
          ? 4
          : 8;

  // Iniciar a animação de shimmer
  useEffect(() => {
    const loopAnimation = () => {
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: speed,
          easing: Easing.ease,
          useNativeDriver: false, // não podemos usar com backgroundImage
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: speed,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ]).start(loopAnimation);
    };

    loopAnimation();

    return () => {
      // Limpar animação
      shimmerValue.stopAnimation();
    };
  }, [shimmerValue, speed]);

  // Criar o fundo com gradiente animado
  const shimmerTranslate = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%'],
  });

  const shimmerStyle = {
    transform: [{ translateX: shimmerTranslate }],
  };

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: defaultBorderRadius,
          backgroundColor: defaultBgColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor: defaultHighlightColor,
            ...shimmerStyle,
          },
        ]}
      />
      {children}
    </View>
  );
};

// Componente composto para card de produto
interface ProductCardSkeletonProps {
  width?: number | string;
  height?: number | string;
  style?: ViewStyle;
}

export const ProductCardSkeleton = ({
  width = 160,
  height = 240,
  style,
}: ProductCardSkeletonProps) => {
  return (
    <View style={[styles.productCard, { width, height }, style]}>
      {/* Imagem */}
      <SkeletonLoader width="100%" height={140} borderRadius={8} />

      {/* Título */}
      <View style={styles.contentPadding}>
        <SkeletonLoader width="85%" height={18} variant="text" style={styles.titleSkeleton} />

        {/* Preço */}
        <SkeletonLoader width="40%" height={20} variant="text" style={styles.priceSkeleton} />

        {/* Botão */}
        <SkeletonLoader width="100%" height={36} style={styles.buttonSkeleton} />
      </View>
    </View>
  );
};

// Componente composto para cards em lista horizontal
export const HorizontalListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <View style={styles.horizontalList}>
      {[...Array(count)].map((_, index) => (
        <ProductCardSkeleton key={`skeleton-${index}`} style={styles.horizontalItem} />
      ))}
    </View>
  );
};

// Componente composto para grid de produtos
export const ProductGridSkeleton = ({
  columns = 2,
  rows = 3,
}: {
  columns?: number;
  rows?: number;
}) => {
  return (
    <View style={styles.grid}>
      {[...Array(columns * rows)].map((_, index) => (
        <ProductCardSkeleton
          key={`grid-skeleton-${index}`}
          style={styles.gridItem}
          width={`${100 / columns - 4}%`}
        />
      ))}
    </View>
  );
};

// Componente para skeleton de detalhe de produto
export const ProductDetailSkeleton = () => {
  return (
    <View style={styles.productDetail}>
      {/* Imagem principal */}
      <SkeletonLoader height={250} width="100%" />

      {/* Título e preço */}
      <View style={styles.detailContent}>
        <SkeletonLoader height={28} width="70%" variant="text" style={styles.detailSpacing} />

        <SkeletonLoader height={24} width="40%" variant="text" style={styles.detailSpacing} />

        {/* Descrição */}
        <SkeletonLoader height={16} width="100%" variant="text" style={styles.detailSpacing} />
        <SkeletonLoader height={16} width="90%" variant="text" style={styles.detailSpacing} />
        <SkeletonLoader height={16} width="80%" variant="text" style={styles.detailSpacing} />

        {/* Botões */}
        <View style={styles.buttonRow}>
          <SkeletonLoader height={48} width="65%" style={styles.detailSpacing} />
          <SkeletonLoader height={48} width="30%" style={styles.detailSpacing} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    opacity: 0.3,
  },
  productCard: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  contentPadding: {
    padding: 12,
  },
  titleSkeleton: {
    marginTop: 8,
  },
  priceSkeleton: {
    marginTop: 8,
    marginBottom: 8,
  },
  buttonSkeleton: {
    marginTop: 8,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  horizontalItem: {
    marginHorizontal: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  gridItem: {
    margin: 8,
  },
  productDetail: {
    flex: 1,
  },
  detailContent: {
    padding: 16,
  },
  detailSpacing: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
