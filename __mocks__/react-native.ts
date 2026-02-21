export const Platform = {
  OS: 'ios',
  select: jest.fn(obj => obj.ios),
};

export const NativeModules = {
  StatusBarManager: {
    getHeight: jest.fn(),
  },
};

export const NativeEventEmitter = jest.fn();

export const AppState = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Dimensions = {
  get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
};

export const Animated = {
  Value: jest.fn(),
  timing: jest.fn(),
  spring: jest.fn(),
  View: 'Animated.View',
};

export const View = 'View';
export const Text = 'Text';
export const TextInput = 'TextInput';
export const TouchableOpacity = 'TouchableOpacity';
export const TouchableHighlight = 'TouchableHighlight';
export const TouchableWithoutFeedback = 'TouchableWithoutFeedback';
export const ScrollView = 'ScrollView';
export const FlatList = 'FlatList';
export const Image = 'Image';
export const StyleSheet = {
  create: jest.fn(styles => styles),
};
