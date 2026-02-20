import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text as RNText,
  Pressable,
  ActivityIndicator as RNActivityIndicator,
} from 'react-native';

export const Switch = ({ value, onValueChange, disabled, testID }: any) => (
  <Pressable
    onPress={() => onValueChange?.(!value)}
    disabled={disabled}
    testID={testID ?? 'switch'}
    accessibilityRole="switch"
    accessibilityState={{ disabled: !!disabled, checked: !!value }}
  />
);
export const Button = ({ onPress, children, style, labelStyle, disabled, testID }: any) => (
  <Pressable onPress={onPress} style={style} disabled={disabled} testID={testID ?? 'button'}>
    <RNText style={labelStyle}>{children}</RNText>
  </Pressable>
);
export const ActivityIndicator = ({ size, color, style, testID }: any) => (
  <View style={style} testID={testID ?? 'loading'}>
    <RNText>{size ?? ''}</RNText>
  </View>
);
export const Chip = ({ children, onPress, selected, mode, style, textStyle }: any) => (
  <Pressable testID="chip" onPress={onPress} style={style} accessibilityState={{ selected }}>
    <RNText style={textStyle}>{children}</RNText>
  </Pressable>
);
export const Badge = ({ children, style }: any) => (
  <View style={style} testID="badge">
    <RNText>{children}</RNText>
  </View>
);
export const Searchbar = ({ placeholder, onChangeText, value, onSubmitEditing, style, right }: any) => (
  <View style={style}>
    <RNTextInput
      testID="searchbar"
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
    />
    {typeof right === 'function' ? right({}) : null}
  </View>
);
export const List = {
  Item: ({ title, description, right, left, onPress, disabled, testID, style }: any) => {
    const Root: any = Pressable;
    return (
      <Root
        onPress={onPress}
        disabled={disabled}
        testID={testID ?? `list-item-${title}`}
        style={style}
        title={title}
        description={description}
      >
        <RNText>{title}</RNText>
        {description ? <RNText>{description}</RNText> : null}
        {left && left({})}
        {right && right()}
      </Root>
    );
  },
  Section: ({ title, children, testID, style }: any) => (
    <View testID={testID ?? `section-${title}`} style={style}>{children}</View>
  ),
  Subheader: ({ children, style, testID }: any) => (
    <RNText style={style} testID={testID ?? `section-${typeof children === 'string' ? children : String(children)}`}>{children}</RNText>
  ),
  Icon: ({ icon, color }: any) => (
    <View><RNText>{icon}</RNText></View>
  ),
};
export const Modal = ({ visible, onDismiss, children, style }: any) => (
  <View style={style} testID="modal">{visible ? children : null}</View>
);
export const Portal = ({ children }: any) => <View>{children}</View>;
export const Provider = ({ children }: any) => <View>{children}</View>;
export const Text = ({ children, style, testID }: any) => <RNText style={style} testID={testID}>{children}</RNText>;
export const Card = ({ children, style }: any) => <View style={style}>{children}</View>;
export const Divider = ({ style, testID }: any) => <View style={[{ height: 1, backgroundColor: '#e0e0e0', width: '100%' }, style]} testID={testID ?? 'divider'} />;
export const ListItem = List.Item;
export const SegmentedButtons = ({ value, onValueChange, buttons, style }: any) => (
  <View testID="segmented-buttons" style={style}>
    {(buttons ?? []).map((b: any, idx: number) => (
      <Pressable key={b?.value ?? idx} onPress={() => onValueChange?.(b?.value)} disabled={!!b?.disabled}>
        <RNText>{b?.label}</RNText>
      </Pressable>
    ))}
  </View>
);
export const useTheme = () => ({
  colors: {
    background: '#FFFFFF',
    primary: '#6200EE',
    onSurface: '#000000',
    text: '#000000',
  },
});

export const Appbar: any = {
  Header: ({ children, style }: any) => <View style={style}>{children}</View>,
  BackAction: ({ onPress }: any) => <Pressable onPress={onPress}><RNText>Back</RNText></Pressable>,
  Content: ({ title }: any) => <RNText>{title}</RNText>,
  Action: ({ icon, onPress, style }: any) => (
    <Pressable onPress={onPress} style={style}><RNText>{icon}</RNText></Pressable>
  ),
};

export const IconButton = ({ icon, onPress, style, disabled, testID }: any) => (
  <Pressable onPress={onPress} style={style} disabled={disabled} testID={testID ?? 'icon-button'}>
    <RNText>{icon}</RNText>
  </Pressable>
);

export const Snackbar = ({ visible, onDismiss, children, duration, action, style, testID }: any) => {
  if (!visible) return null;
  return (
    <View style={style} testID={testID ?? 'snackbar'}>
      <RNText>{children}</RNText>
      {action?.label ? (
        <Pressable onPress={action.onPress}>
          <RNText>{action.label}</RNText>
        </Pressable>
      ) : null}
    </View>
  );
};

const DialogRoot = ({ visible, children, style, testID }: any) => (
  visible ? <View style={style} testID={testID ?? 'dialog'}>{children}</View> : null
);
DialogRoot.Title = ({ children, style }: any) => <RNText style={style}>{children}</RNText>;
DialogRoot.Content = ({ children, style }: any) => <View style={style}>{children}</View>;
DialogRoot.Actions = ({ children, style }: any) => <View style={style}>{children}</View>;
export const Dialog: any = DialogRoot as any;

export const RadioButton = ({ status = 'unchecked', onPress, testID, style }: any) => (
  <Pressable onPress={onPress} testID={testID ?? 'radio-button'} style={style}>
    <RNText>{status === 'checked' ? '◉' : '◯'}</RNText>
  </Pressable>
);

export const FAB = ({ icon, label, onPress, style, testID }: any) => (
  <Pressable onPress={onPress} style={style} testID={testID ?? 'fab'}>
    <RNText>{icon || label || 'FAB'}</RNText>
  </Pressable>
);

export const Avatar: any = {
  Icon: ({ icon, size = 40, style }: any) => (
    <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <RNText>{icon}</RNText>
    </View>
  ),
  Image: ({ size = 40, style }: any) => (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, style]} testID="avatar-image" />
  ),
  Text: ({ label, size = 40, style }: any) => (
    <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <RNText>{label}</RNText>
    </View>
  ),
};

export const Title = ({ children, style, testID }: any) => <RNText style={style} testID={testID ?? 'title'}>{children}</RNText>;
export const Caption = ({ children, style, testID }: any) => <RNText style={style} testID={testID ?? 'caption'}>{children}</RNText>;
export const Surface = ({ children, style, testID }: any) => <View style={style} testID={testID ?? 'surface'}>{children}</View>;

export const Menu: any = ({ visible, onDismiss, anchor, children, style, testID }: any) => (
  visible ? (
    <View style={style} testID={testID ?? 'menu'}>
      <View testID="menu-anchor">{anchor}</View>
      {children}
    </View>
  ) : null
);
Menu.Item = ({ onPress, title, disabled, style }: any) => (
  <Pressable onPress={onPress} disabled={disabled} style={style}>
    <RNText>{title}</RNText>
  </Pressable>
);

export const TextInput = ({ value, onChangeText, placeholder, style, testID }: any) => (
  <RNTextInput value={value} onChangeText={onChangeText} placeholder={placeholder} style={style} testID={testID ?? 'text-input'} />
);

const defaultFonts = {
  regular: { fontFamily: 'System', fontWeight: 'normal' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  light: { fontFamily: 'System', fontWeight: '300' },
  thin: { fontFamily: 'System', fontWeight: '100' },
};

export const MD3LightTheme = {
  isV3: true,
  version: 3,
  roundness: 4,
  animation: { scale: 1 },
  colors: {
    primary: '#6200EE',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    error: '#B00020',
    onSurface: '#000000',
    onBackground: '#000000',
    onPrimary: '#FFFFFF',
    outline: '#D1D5DB',
    surfaceVariant: '#F2F2F2',
  },
  fonts: defaultFonts,
};
export const MD3DarkTheme = {
  isV3: true,
  version: 3,
  roundness: 4,
  animation: { scale: 1 },
  colors: {
    primary: '#BB86FC',
    background: '#121212',
    surface: '#1E1E1E',
    error: '#CF6679',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
    onPrimary: '#000000',
    outline: '#374151',
    surfaceVariant: '#2A2A2A',
  },
  fonts: defaultFonts,
};

export default {
  Switch,
  Button,
  ActivityIndicator,
  Chip,
  Badge,
  Searchbar,
  List,
  Modal,
  Portal,
  Provider,
  Text,
  Card,
  Divider,
  ListItem,
  SegmentedButtons,
  useTheme,
  Appbar,
  IconButton,
  Snackbar,
  Dialog,
  RadioButton,
  FAB,
  Avatar,
  Title,
  Caption,
  Surface,
  Menu,
  TextInput,
  MD3LightTheme,
  MD3DarkTheme,
};
