import React from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonItem = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style = {},
}: SkeletonProps) => {
  const theme = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, [animatedValue]);

  const rangeWidth = typeof width === 'number' ? width : Dimensions.get('window').width;
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-rangeWidth, rangeWidth],
  });

  return (
    <View
      style={[
        {
          width: rangeWidth,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceVariant,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
        }}
      />
    </View>
  );
};

export const ProductSkeletonItem = () => {
  return (
    <View style={styles.productItem}>
      <SkeletonItem height={120} borderRadius={8} />
      <View style={styles.productDetails}>
        <SkeletonItem width="70%" height={18} style={styles.margin} />
        <SkeletonItem width="40%" height={16} style={styles.margin} />
        <SkeletonItem width="30%" height={14} style={styles.margin} />
      </View>
    </View>
  );
};

export const OrderSkeletonItem = () => {
  return (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <SkeletonItem width="40%" height={18} />
        <SkeletonItem width="30%" height={18} />
      </View>
      <View style={styles.orderDetails}>
        <SkeletonItem width="90%" height={16} style={styles.margin} />
        <SkeletonItem width="60%" height={16} style={styles.margin} />
      </View>
      <View style={styles.orderFooter}>
        <SkeletonItem width="40%" height={14} />
        <SkeletonItem width="20%" height={14} />
      </View>
    </View>
  );
};

export const SkeletonList = ({ type = 'product', count = 3 }) => {
  const items = Array(count).fill(0);

  return (
    <View style={styles.container}>
      {items.map((_, index) => (
        <React.Fragment key={index}>
          {type === 'product' ? <ProductSkeletonItem /> : <OrderSkeletonItem />}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  productItem: {
    marginBottom: 16,
  },
  productDetails: {
    marginTop: 8,
  },
  orderItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderDetails: {
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  margin: {
    marginBottom: 8,
  },
});
