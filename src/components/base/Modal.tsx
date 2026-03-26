import React from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useAppTheme } from '../ThemeProvider';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  contentStyle?: ViewStyle;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  containerStyle,
  titleStyle,
  contentStyle,
}: ModalProps) {
  const { theme } = useAppTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, containerStyle]}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.background,
            },
            contentStyle,
          ]}
        >
          <View style={styles.header}>
            {title && (
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.text.primary,
                  },
                  titleStyle,
                ]}
              >
                {title}
              </Text>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text
                style={[
                  styles.closeButtonText,
                  {
                    color: theme.colors.text.secondary,
                  },
                ]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '92%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
  },
});
