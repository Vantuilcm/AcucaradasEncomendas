import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

type LottieHandle = {
  play: (_startFrame?: number, _endFrame?: number) => void;
};

const LottieView = forwardRef<LottieHandle, any>((props, ref) => {
  useImperativeHandle(ref, () => ({
    play: () => {},
  }));

  return <View {...props} />;
});

LottieView.displayName = 'LottieView';

export default LottieView;
