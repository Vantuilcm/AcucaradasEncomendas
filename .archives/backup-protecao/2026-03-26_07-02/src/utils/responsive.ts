import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const wp = (size: number) => (width / guidelineBaseWidth) * size;
export const hp = (size: number) => (height / guidelineBaseHeight) * size;
export const spacing = (size: number) => wp(size);
export const fontSize = (size: number) => PixelRatio.roundToNearestPixel(wp(size));
