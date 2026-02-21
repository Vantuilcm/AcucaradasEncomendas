import { Animated, StyleSheet } from 'react-native';
import * as React from 'react';
import { useHeaderBackgroundColor } from '../utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function DatePickerModalHeaderBackground(_ref) {
  let {
    children
  } = _ref;
  const backgroundColor = useHeaderBackgroundColor();
  const insets = useSafeAreaInsets();
  return /*#__PURE__*/React.createElement(Animated.View, {
    style: [styles.animated, {
      backgroundColor,
      paddingLeft: insets.left,
      paddingRight: insets.right
    }]
  }, children);
}
const styles = StyleSheet.create({
  animated: {
    elevation: 4
  }
});
//# sourceMappingURL=DatePickerModalHeaderBackground.js.map