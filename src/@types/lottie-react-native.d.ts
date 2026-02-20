declare module 'lottie-react-native' {
  import * as React from 'react';
  export interface LottieViewProps {
    source: any;
    autoPlay?: boolean;
    loop?: boolean;
    style?: any;
    onAnimationFinish?: () => void;
  }
  export default class LottieView extends React.Component<LottieViewProps> {}
}