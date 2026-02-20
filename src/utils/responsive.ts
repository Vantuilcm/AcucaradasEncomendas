import { Dimensions, PixelRatio, Platform } from 'react-native';
import React from 'react';

// Dimensões base de design (pode ser ajustado conforme necessário)
const BASE_WIDTH = 375; // iPhone X width
const BASE_HEIGHT = 812; // iPhone X height

// Obter dimensões da tela
const { width, height } = Dimensions.get('window');

// Calculando o rácio
const widthRatio = width / BASE_WIDTH;
const heightRatio = height / BASE_HEIGHT;

/**
 * Converte uma unidade de largura para uma escala responsiva
 * @param size Tamanho em px baseado no design de largura base
 * @returns Tamanho em px adaptado para o dispositivo atual
 */
export const wp = (widthPercent: number): number => {
  return (width * widthPercent) / 100;
};

/**
 * Converte uma unidade de altura para uma escala responsiva
 * @param size Tamanho em px baseado no design de altura base
 * @returns Tamanho em px adaptado para o dispositivo atual
 */
export const hp = (heightPercent: number): number => {
  return (height * heightPercent) / 100;
};

/**
 * Retorna o tamanho da fonte baseado no tamanho da tela
 * @param size Tamanho base da fonte
 */
export const fontSize = (size: number): number => {
  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  const newSize = size * scale;
  return Math.round(newSize);
};

/**
 * Responsividade para margens e paddings
 * @param size Tamanho base
 */
export const spacing = (value: number): number => {
  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  return Math.round(value * scale);
};

/**
 * Retorna true se o dispositivo for um tablet
 */
export const isTablet = (): boolean => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = width * pixelDensity;
  const adjustedHeight = height * pixelDensity;

  return (
    // Densidade menor que 2 é geralmente tablet
    (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) ||
    // iPad Pro e similares com alta densidade de pixels
    (pixelDensity >= 2 && (adjustedWidth >= 1824 || adjustedHeight >= 1824))
  );
};

/**
 * Hook para obter dimensões atualizadas quando a orientação mudar
 */
export const useResponsiveDimensions = () => {
  const [dimensions, setDimensions] = React.useState({
    width: width,
    height: height,
  });

  React.useEffect(() => {
    const onChange = ({ window }: { window: { width: number; height: number } }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
    };

    const subscription = Dimensions.addEventListener('change', onChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return dimensions;
};

export default {
  wp,
  hp,
  fontSize,
  spacing,
  isTablet,
  useResponsiveDimensions,
  width,
  height,
};
